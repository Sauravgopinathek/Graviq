import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function BotEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [knowledge, setKnowledge] = useState(null);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawlMaxPages, setCrawlMaxPages] = useState(25);
  const [crawling, setCrawling] = useState(false);

  const [form, setForm] = useState({
    name: '',
    domains: '',
    welcomeMessage: 'Hello! How can I help you today?',
    businessName: '',
    businessContext: '',
    tone: 'friendly',
    language: 'English',
    theme: 'dark',
    position: 'bottom-right',
  });

  useEffect(() => {
    if (!isNew) {
      loadBot();
    }
  }, [id]);

  const loadBot = async () => {
    try {
      const res = await api.get(`/api/bots/${id}`);
      const bot = res.data.bot;
      setForm({
        name: bot.name,
        domains: (bot.domains || []).join(', '),
        welcomeMessage: bot.config?.welcomeMessage || '',
        businessName: bot.config?.businessName || '',
        businessContext: bot.config?.businessContext || '',
        tone: bot.config?.tone || 'friendly',
        language: bot.config?.language || 'English',
        theme: bot.config?.theme || 'dark',
        position: bot.config?.position || 'bottom-right',
      });
      if (!crawlUrl && bot.domains?.[0]) {
        setCrawlUrl(bot.domains[0].includes('://') ? bot.domains[0] : `https://${bot.domains[0]}`);
      }

      // Load embed code
      try {
        const embedRes = await api.get(`/api/bots/${id}/embed`);
        setEmbedCode(embedRes.data.embedCode);
      } catch {
        // ignore
      }

      try {
        const knowledgeRes = await api.get(`/api/bots/${id}/knowledge`);
        setKnowledge(knowledgeRes.data.knowledge);
      } catch {
        setKnowledge(null);
      }
    } catch (err) {
      console.error('Failed to load bot:', err);
      navigate('/bots');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      domains: form.domains.split(',').map((d) => d.trim()).filter(Boolean),
      config: {
        welcomeMessage: form.welcomeMessage,
        businessName: form.businessName,
        businessContext: form.businessContext,
        tone: form.tone,
        language: form.language,
        theme: form.theme,
        position: form.position,
      },
    };

    try {
      if (isNew) {
        const res = await api.post('/api/bots', payload);
        navigate(`/bots/${res.data.bot.id}`);
      } else {
        await api.put(`/api/bots/${id}`, payload);
        await loadBot();
      }
    } catch (err) {
      console.error('Failed to save bot:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const crawlWebsite = async () => {
    if (!crawlUrl.trim()) {
      alert('Enter a website URL to crawl.');
      return;
    }

    setCrawling(true);
    try {
      await api.post(`/api/bots/${id}/crawl`, {
        startUrl: crawlUrl.trim(),
        maxPages: Number(crawlMaxPages) || 25,
      });
      const knowledgeRes = await api.get(`/api/bots/${id}/knowledge`);
      setKnowledge(knowledgeRes.data.knowledge);
      alert('Website knowledge indexed successfully.');
    } catch (err) {
      console.error('Failed to crawl website:', err);
      alert(err.response?.data?.error || 'Failed to crawl website. Please check the URL and try again.');
    } finally {
      setCrawling(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading bot...</div>;
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>{isNew ? 'Create Bot' : `Edit: ${form.name}`}</h2>
          <p>{isNew ? 'Set up a new AI lead generation bot' : 'Update your bot configuration'}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/bots')}>
          ← Back to Bots
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Basic Info</h3>

            <div className="form-group">
              <label className="form-label">Bot Name</label>
              <input
                id="bot-name"
                type="text"
                className="form-input"
                value={form.name}
                onChange={handleChange('name')}
                placeholder="e.g., Sales Assistant"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input
                type="text"
                className="form-input"
                value={form.businessName}
                onChange={handleChange('businessName')}
                placeholder="e.g., Acme Corp"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Allowed Domains (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={form.domains}
                onChange={handleChange('domains')}
                placeholder="e.g., example.com, shop.example.com"
              />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>AI Configuration</h3>

            <div className="form-group">
              <label className="form-label">Welcome Message</label>
              <input
                type="text"
                className="form-input"
                value={form.welcomeMessage}
                onChange={handleChange('welcomeMessage')}
                placeholder="Hello! How can I help you today?"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Context</label>
              <textarea
                className="form-textarea"
                value={form.businessContext}
                onChange={handleChange('businessContext')}
                placeholder="Describe your business, products, services. This context will be used by the AI to have informed conversations."
                rows={5}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Tone</label>
                <select className="form-select" value={form.tone} onChange={handleChange('tone')}>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="playful">Playful</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Language</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.language}
                  onChange={handleChange('language')}
                  placeholder="English"
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Widget Appearance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Theme</label>
                <select className="form-select" value={form.theme} onChange={handleChange('theme')}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Position</label>
                <select className="form-select" value={form.position} onChange={handleChange('position')}>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>
          </div>

          <button id="bot-save" type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Create Bot' : 'Save Changes'}
          </button>
        </form>

        {!isNew && embedCode && (
          <div className="card" style={{ position: 'sticky', top: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Embed Code</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Copy and paste this code into your website's HTML to add the chat widget.
            </p>
            <div className="embed-code">
              <button
                className="btn btn-secondary btn-sm embed-code-copy"
                onClick={copyEmbed}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
              {embedCode}
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/bots/${id}/leads`)}
              >
                📋 View Leads
              </button>
            </div>
          </div>
        )}

        {!isNew && (
          <div className="card" style={{ gridColumn: '2', marginTop: embedCode ? 20 : 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Website Knowledge</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Crawl sitemap.xml or internal pages, then store vectorized website chunks for AI answers.
            </p>

            <div className="form-group">
              <label className="form-label">Website URL</label>
              <input
                type="url"
                className="form-input"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Pages</label>
              <input
                type="number"
                min="1"
                max="100"
                className="form-input"
                value={crawlMaxPages}
                onChange={(e) => setCrawlMaxPages(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" type="button" onClick={crawlWebsite} disabled={crawling}>
              {crawling ? 'Indexing...' : 'Crawl & Vectorize'}
            </button>

            {knowledge && (
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <div>Indexed pages: {knowledge.documents}</div>
                <div>Vector chunks: {knowledge.chunks}</div>
                {knowledge.sources?.[0] && (
                  <div>Last crawl: {knowledge.sources[0].status} ({knowledge.sources[0].page_count} pages)</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
