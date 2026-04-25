const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { generateReply, classifyIntent, analyzeSentiment } = require('../services/ai');
const { getOrCreateSession, updateSession, STAGES } = require('../services/sessionManager');

const router = express.Router();

function normalizeAllowedDomain(domain) {
  if (!domain || typeof domain !== 'string') return null;

  const trimmed = domain.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .split(':')[0]
      .toLowerCase();
  }
}

function isAllowedDomain(hostname, domains) {
  const normalizedHostname = hostname.toLowerCase();

  return domains
    .map(normalizeAllowedDomain)
    .filter(Boolean)
    .some((domain) => normalizedHostname === domain || normalizedHostname.endsWith(`.${domain}`));
}

// POST /api/conversations — start a new conversation (public)
router.post(
  '/',
  [body('botId').isUUID(), body('sourceUrl').optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation failed on POST /api/conversations:', errors.array(), 'Body:', req.body);
      return res.status(400).json({ errors: errors.array() });
    }

    const { botId, sourceUrl } = req.body;

    try {
      // Get bot and validate
      const botResult = await db.query('SELECT * FROM bots WHERE id = $1', [botId]);
      if (botResult.rows.length === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const bot = botResult.rows[0];

      // Domain validation
      if (sourceUrl && bot.domains && bot.domains.length > 0) {
        try {
          const parsedUrl = new URL(sourceUrl);

          // Allow opening a local HTML file directly during development.
          if (parsedUrl.protocol === 'file:') {
            throw new Error('skip-domain-check-for-file-url');
          }

          const allowed = isAllowedDomain(parsedUrl.hostname, bot.domains);
          if (!allowed) {
            return res.status(403).json({ error: 'Domain not allowed' });
          }
        } catch (e) {
          // Invalid URL or local file URL, skip domain check
        }
      }

      // Generate welcome message from AI
      const welcomeMessage =
        bot.config.welcomeMessage || 'Hello! How can I help you today?';

      const messages = [{ role: 'assistant', content: welcomeMessage }];

      const conversation = await db.query(
        'INSERT INTO conversations (bot_id, messages) VALUES ($1, $2) RETURNING id, bot_id, messages, created_at',
        [botId, JSON.stringify(messages)]
      );

      res.status(201).json({
        conversation: conversation.rows[0],
        sourceUrl,
      });
    } catch (err) {
      console.error('Create conversation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/conversations/:id/message — send user message, get AI reply (public)
router.post(
  '/:id/message',
  [param('id').isUUID(), body('content').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;

    try {
      // Get conversation
      const convResult = await db.query('SELECT * FROM conversations WHERE id = $1', [
        req.params.id,
      ]);
      if (convResult.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = convResult.rows[0];

      // Get bot config
      const botResult = await db.query('SELECT * FROM bots WHERE id = $1', [conversation.bot_id]);
      if (botResult.rows.length === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const bot = botResult.rows[0];

      // Get or create session
      const session = await getOrCreateSession(conversation.id);

      // Add user message
      const messages = conversation.messages || [];
      messages.push({ role: 'user', content });

      // Update session based on user input
      const updatedSession = await updateSession(session.id, content, session.stage, conversation.id);

      // Generate AI reply with session context
      const sessionData = { name: updatedSession.name, phone: updatedSession.phone };
      const aiReply = await generateReply(bot.config, messages, updatedSession.stage, sessionData);
      messages.push({ role: 'assistant', content: aiReply });

      // Create or update lead if session is complete
      let leadId = conversation.lead_id;
      let leadIntent = null;
      let leadConfidence = null;
      let conversationSentiment = null;

      if (updatedSession.stage === STAGES.COMPLETE && updatedSession.name && updatedSession.phone) {
        // Run intent classification and sentiment analysis in parallel
        const [intentResult, sentimentResult] = await Promise.all([
          classifyIntent(bot.config, messages),
          analyzeSentiment(bot.config, messages),
        ]);

        leadIntent = intentResult.intent;
        leadConfidence = intentResult.confidence;
        conversationSentiment = sentimentResult;

        if (!leadId) {
          const leadResult = await db.query(
            `INSERT INTO leads (bot_id, name, phone, email, source_url, intent, confidence_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [
              bot.id,
              updatedSession.name,
              updatedSession.phone,
              updatedSession.email || null,
              req.body.sourceUrl || null,
              leadIntent,
              leadConfidence,
            ]
          );
          leadId = leadResult.rows[0].id;
        } else {
          await db.query(
            'UPDATE leads SET name = $1, phone = $2, email = $3, intent = $4, confidence_score = $5 WHERE id = $6',
            [updatedSession.name, updatedSession.phone, updatedSession.email || null, leadIntent, leadConfidence, leadId]
          );
        }
      }

      // Update conversation
      await db.query(
        'UPDATE conversations SET messages = $1, lead_id = $2, sentiment = $3, updated_at = NOW() WHERE id = $4',
        [JSON.stringify(messages), leadId, conversationSentiment, conversation.id]
      );

      // Calculate progress
      const capturedFields = [];
      if (updatedSession.name) capturedFields.push('name');
      if (updatedSession.phone) capturedFields.push('phone');

      const totalRequired = 2;
      const progress = Math.min(capturedFields.length, totalRequired) / totalRequired;

      res.json({
        reply: aiReply,
        session: {
          stage: updatedSession.stage,
          name: updatedSession.name,
          phone: updatedSession.phone,
        },
        progress: {
          percentage: Math.round(progress * 100),
          captured: capturedFields,
          stepsLeft: totalRequired - capturedFields.length,
        },
        leadCaptured: updatedSession.stage === STAGES.COMPLETE,
      });
    } catch (err) {
      console.error('Message error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
