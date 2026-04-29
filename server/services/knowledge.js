const crypto = require('crypto');
const OpenAI = require('openai');
const db = require('../db');

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || 'missing-nvidia-api-key',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const DEFAULT_EMBEDDING_MODEL = process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nv-embedqa-e5-v5';
const MAX_PAGES = parseInt(process.env.CRAWL_MAX_PAGES || '25', 10);
const MAX_CHARS_PER_PAGE = parseInt(process.env.CRAWL_MAX_CHARS_PER_PAGE || '60000', 10);
const CHUNK_SIZE = parseInt(process.env.KNOWLEDGE_CHUNK_SIZE || '1200', 10);
const CHUNK_OVERLAP = parseInt(process.env.KNOWLEDGE_CHUNK_OVERLAP || '180', 10);
const FALLBACK_EMBEDDING_DIMS = 256;

let schemaReady = false;
let embeddingProvider = 'nvidia';

async function ensureKnowledgeSchema() {
  if (schemaReady) return;

  await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS bot_sources (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      source_url TEXT NOT NULL,
      source_type VARCHAR(32) NOT NULL DEFAULT 'sitemap',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      page_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS bot_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      source_id UUID REFERENCES bot_sources(id) ON DELETE SET NULL,
      url TEXT NOT NULL,
      title TEXT,
      content_hash TEXT NOT NULL,
      crawled_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (bot_id, url)
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS bot_document_chunks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      document_id UUID NOT NULL REFERENCES bot_documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding REAL[] NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (document_id, chunk_index)
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_bot_sources_bot_id ON bot_sources(bot_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_bot_documents_bot_id ON bot_documents(bot_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_bot_document_chunks_bot_id ON bot_document_chunks(bot_id);`);

  schemaReady = true;
}

function normalizeStartUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  return trimmed.includes('://') ? trimmed : `https://${trimmed}`;
}

function normalizeUrl(value, baseUrl) {
  try {
    const parsed = new URL(value, baseUrl);
    parsed.hash = '';
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function sameHostname(url, rootUrl) {
  try {
    return new URL(url).hostname === new URL(rootUrl).hostname;
  } catch {
    return false;
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'GraviqBot/1.0 (+https://graviq.dev)',
        accept: 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractSitemapUrls(xml, rootUrl) {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi))
    .map((match) => decodeEntities(match[1]).trim())
    .map((url) => normalizeUrl(url, rootUrl))
    .filter((url) => url && sameHostname(url, rootUrl));
}

function getSitemapCandidates(startUrl) {
  const root = new URL(startUrl);
  return [
    normalizeUrl('/sitemap.xml', root.origin),
    normalizeUrl('/sites.xml', root.origin),
  ];
}

async function discoverUrlsFromSitemap(startUrl, maxPages) {
  const candidates = getSitemapCandidates(startUrl);

  for (const sitemapUrl of candidates) {
    try {
      const xml = await fetchText(sitemapUrl);
      const urls = extractSitemapUrls(xml, startUrl).slice(0, maxPages);
      if (urls.length > 0) {
        return { urls, sourceUrl: sitemapUrl, sourceType: 'sitemap' };
      }
    } catch {
      // Try the next candidate, then fallback to link crawling.
    }
  }

  return { urls: [], sourceUrl: startUrl, sourceType: 'crawl' };
}

function extractLinks(html, pageUrl, rootUrl) {
  return Array.from(html.matchAll(/\s(?:href)=["']([^"']+)["']/gi))
    .map((match) => normalizeUrl(decodeEntities(match[1]), pageUrl))
    .filter((url) => {
      if (!url || !sameHostname(url, rootUrl)) return false;
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol) && !/\.(pdf|png|jpe?g|gif|webp|svg|zip|mp4|mp3)$/i.test(parsed.pathname);
    });
}

function cleanHtml(html) {
  const withoutNoise = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ');

  const titleMatch = withoutNoise.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : '';
  const text = decodeEntities(withoutNoise.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

  return {
    title,
    text: text.slice(0, MAX_CHARS_PER_PAGE),
  };
}

async function discoverUrlsByLinks(startUrl, maxPages) {
  const queue = [startUrl];
  const seen = new Set();
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    try {
      const html = await fetchText(url);
      pages.push({ url, html });
      for (const link of extractLinks(html, url, startUrl)) {
        if (!seen.has(link) && queue.length + pages.length < maxPages * 2) {
          queue.push(link);
        }
      }
    } catch {
      // Ignore individual page failures during discovery.
    }
  }

  return pages;
}

function chunkText(text) {
  const chunks = [];
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    const chunk = clean.slice(start, end).trim();
    if (chunk.length >= 80) chunks.push(chunk);
    if (end === clean.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP);
  }

  return chunks;
}

function fallbackEmbedding(text) {
  const vector = new Array(FALLBACK_EMBEDDING_DIMS).fill(0);
  const words = String(text || '').toLowerCase().match(/[a-z0-9]+/g) || [];

  for (const word of words) {
    const hash = crypto.createHash('sha256').update(word).digest();
    const index = hash.readUInt16BE(0) % FALLBACK_EMBEDDING_DIMS;
    vector[index] += 1;
  }

  return normalizeVector(vector);
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

async function embedText(text) {
  if (embeddingProvider === 'fallback' || !process.env.NVIDIA_API_KEY) {
    return fallbackEmbedding(text);
  }

  try {
    const response = await client.embeddings.create({
      model: DEFAULT_EMBEDDING_MODEL,
      input: text.slice(0, 6000),
    });

    return normalizeVector(response.data[0].embedding.map(Number));
  } catch (err) {
    console.error('NVIDIA embedding error, using local fallback:', err.message);
    embeddingProvider = 'fallback';
    return fallbackEmbedding(text);
  }
}

function cosineSimilarity(a, b) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aMag = 0;
  let bMag = 0;

  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }

  return dot / ((Math.sqrt(aMag) || 1) * (Math.sqrt(bMag) || 1));
}

function contentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function storePage({ botId, sourceId, url, title, text }) {
  const hash = contentHash(text);
  const documentResult = await db.query(
    `INSERT INTO bot_documents (bot_id, source_id, url, title, content_hash, crawled_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (bot_id, url)
     DO UPDATE SET title = EXCLUDED.title, content_hash = EXCLUDED.content_hash, crawled_at = NOW(), source_id = EXCLUDED.source_id
     RETURNING id`,
    [botId, sourceId, url, title || null, hash]
  );

  const documentId = documentResult.rows[0].id;
  await db.query('DELETE FROM bot_document_chunks WHERE document_id = $1', [documentId]);

  const chunks = chunkText(text);
  for (let i = 0; i < chunks.length; i += 1) {
    const embedding = await embedText(chunks[i]);
    await db.query(
      `INSERT INTO bot_document_chunks (bot_id, document_id, chunk_index, chunk_text, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [botId, documentId, i, chunks[i], embedding, JSON.stringify({ url, title })]
    );
  }

  return chunks.length;
}

async function crawlAndIndexBot({ botId, startUrl, maxPages = MAX_PAGES }) {
  await ensureKnowledgeSchema();

  const normalizedStartUrl = normalizeStartUrl(startUrl);
  if (!normalizedStartUrl) {
    throw new Error('A website URL is required');
  }

  const cappedMaxPages = Math.max(1, Math.min(parseInt(maxPages, 10) || MAX_PAGES, 100));
  const discovery = await discoverUrlsFromSitemap(normalizedStartUrl, cappedMaxPages);
  const sourceResult = await db.query(
    `INSERT INTO bot_sources (bot_id, source_url, source_type, status)
     VALUES ($1, $2, $3, 'running')
     RETURNING id`,
    [botId, discovery.sourceUrl, discovery.sourceType]
  );

  const sourceId = sourceResult.rows[0].id;

  try {
    let pages = [];
    if (discovery.urls.length > 0) {
      for (const url of discovery.urls) {
        try {
          pages.push({ url, html: await fetchText(url) });
        } catch {
          // Continue indexing other sitemap pages.
        }
      }
    } else {
      pages = await discoverUrlsByLinks(normalizedStartUrl, cappedMaxPages);
    }

    let indexedPages = 0;
    let indexedChunks = 0;

    for (const page of pages.slice(0, cappedMaxPages)) {
      const cleaned = cleanHtml(page.html);
      if (cleaned.text.length < 100) continue;

      indexedChunks += await storePage({
        botId,
        sourceId,
        url: page.url,
        title: cleaned.title,
        text: cleaned.text,
      });
      indexedPages += 1;
    }

    await db.query(
      `UPDATE bot_sources SET status = 'complete', page_count = $1, updated_at = NOW() WHERE id = $2`,
      [indexedPages, sourceId]
    );

    return {
      sourceId,
      sourceUrl: discovery.sourceUrl,
      sourceType: discovery.sourceType,
      indexedPages,
      indexedChunks,
      embeddingProvider,
    };
  } catch (err) {
    await db.query(
      `UPDATE bot_sources SET status = 'failed', last_error = $1, updated_at = NOW() WHERE id = $2`,
      [err.message, sourceId]
    );
    throw err;
  }
}

async function getKnowledgeStatus(botId) {
  await ensureKnowledgeSchema();

  const [sourceResult, documentResult, chunkResult] = await Promise.all([
    db.query(
      `SELECT id, source_url, source_type, status, page_count, last_error, created_at, updated_at
       FROM bot_sources WHERE bot_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [botId]
    ),
    db.query('SELECT COUNT(*)::int AS count FROM bot_documents WHERE bot_id = $1', [botId]),
    db.query('SELECT COUNT(*)::int AS count FROM bot_document_chunks WHERE bot_id = $1', [botId]),
  ]);

  return {
    sources: sourceResult.rows,
    documents: documentResult.rows[0].count,
    chunks: chunkResult.rows[0].count,
  };
}

async function retrieveKnowledgeContext(botId, query, limit = 5) {
  await ensureKnowledgeSchema();

  const chunkResult = await db.query(
    `SELECT c.chunk_text, c.embedding, d.url, d.title
     FROM bot_document_chunks c
     INNER JOIN bot_documents d ON d.id = c.document_id
     WHERE c.bot_id = $1
     ORDER BY c.created_at DESC
     LIMIT 300`,
    [botId]
  );

  if (chunkResult.rows.length === 0) return [];

  const queryEmbedding = await embedText(query);
  return chunkResult.rows
    .map((row) => ({
      text: row.chunk_text,
      url: row.url,
      title: row.title,
      score: cosineSimilarity(queryEmbedding, row.embedding.map(Number)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  crawlAndIndexBot,
  getKnowledgeStatus,
  retrieveKnowledgeContext,
};
