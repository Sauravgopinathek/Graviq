const express = require('express');
const { param, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { extractLeadInfo } = require('../services/leadValidator');

const router = express.Router();

// GET /api/bots/:botId/leads — list leads for a bot
router.get(
  '/bots/:botId/leads',
  authMiddleware,
  param('botId').isUUID(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { botId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
      // Verify ownership
      const bot = await db.query('SELECT id FROM bots WHERE id = $1 AND user_id = $2', [
        botId,
        req.user.id,
      ]);
      if (bot.rows.length === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const countResult = await db.query('SELECT COUNT(*) FROM leads WHERE bot_id = $1', [botId]);
      const total = parseInt(countResult.rows[0].count);

      const result = await db.query(
        'SELECT * FROM leads WHERE bot_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [botId, limit, offset]
      );

      res.json({
        leads: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('List leads error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/leads/:id — lead detail with conversation
router.get('/leads/:id', authMiddleware, param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const lead = await db.query(
      `SELECT l.*, c.messages, c.sentiment, c.created_at as conversation_started
       FROM leads l
       LEFT JOIN conversations c ON c.lead_id = l.id
       JOIN bots b ON l.bot_id = b.id
       WHERE l.id = $1 AND b.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (lead.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ lead: lead.rows[0] });
  } catch (err) {
    console.error('Lead detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bots/:botId/leads/export — CSV download
router.get(
  '/bots/:botId/leads/export',
  authMiddleware,
  param('botId').isUUID(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { botId } = req.params;

    try {
      const bot = await db.query('SELECT id FROM bots WHERE id = $1 AND user_id = $2', [
        botId,
        req.user.id,
      ]);
      if (bot.rows.length === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const result = await db.query(
        'SELECT name, phone, email, intent, confidence_score, source_url, created_at FROM leads WHERE bot_id = $1 ORDER BY created_at DESC',
        [botId]
      );

      if (result.rows.length === 0) {
        return res.status(200).send('name,phone,email,intent,confidence_score,source_url,created_at\n');
      }

      const { Parser } = require('json2csv');
      const parser = new Parser({
        fields: ['name', 'phone', 'email', 'intent', 'confidence_score', 'source_url', 'created_at'],
      });
      const csv = parser.parse(result.rows);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=leads-${botId}.csv`);
      res.send(csv);
    } catch (err) {
      console.error('Export leads error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/bots/:botId/leads/webhook — push leads to external CRM
router.post(
  '/bots/:botId/leads/webhook',
  authMiddleware,
  param('botId').isUUID(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { botId } = req.params;
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    try {
      const bot = await db.query('SELECT id FROM bots WHERE id = $1 AND user_id = $2', [
        botId,
        req.user.id,
      ]);
      if (bot.rows.length === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const result = await db.query(
        'SELECT name, phone, email, intent, confidence_score, source_url, created_at FROM leads WHERE bot_id = $1 ORDER BY created_at DESC',
        [botId]
      );

      // Push to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, leads: result.rows }),
      });

      if (!response.ok) {
        return res.status(502).json({ error: 'Webhook delivery failed', status: response.status });
      }

      res.json({ message: 'Leads sent successfully', count: result.rows.length });
    } catch (err) {
      console.error('Webhook error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
