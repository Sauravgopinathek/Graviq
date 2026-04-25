const express = require('express');
const { param, body, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { impressionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// POST /api/bots/:botId/impression — public endpoint (widget fires on load)
router.post(
  '/bots/:botId/impression',
  impressionLimiter,
  param('botId').isUUID(),
  body('sourceUrl').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { botId } = req.params;
    const { sourceUrl } = req.body;

    try {
      // Verify bot exists
      const bot = await db.query('SELECT id FROM bots WHERE id = $1', [botId]);
      if (bot.rows.length === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      await db.query(
        'INSERT INTO bot_impressions (bot_id, source_url) VALUES ($1, $2)',
        [botId, sourceUrl || null]
      );

      res.status(201).json({ ok: true });
    } catch (err) {
      // Silently handle — impressions are best-effort
      console.error('Impression tracking error:', err.message);
      res.status(200).json({ ok: true });
    }
  }
);

// GET /api/bots/:botId/analytics
router.get(
  '/bots/:botId/analytics',
  authMiddleware,
  param('botId').isUUID(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { botId } = req.params;

    try {
      // Verify ownership
      const bot = await db.query('SELECT id FROM bots WHERE id = $1 AND user_id = $2', [
        botId,
        req.user.id,
      ]);
      if (bot.rows.length === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      // Total conversations
      const totalConvs = await db.query(
        'SELECT COUNT(*) FROM conversations WHERE bot_id = $1',
        [botId]
      );

      // Conversations with leads (conversions)
      const conversions = await db.query(
        'SELECT COUNT(*) FROM conversations WHERE bot_id = $1 AND lead_id IS NOT NULL',
        [botId]
      );

      // Total leads
      const totalLeads = await db.query(
        'SELECT COUNT(*) FROM leads WHERE bot_id = $1',
        [botId]
      );

      // Average message count per conversation (proxy for chat duration)
      const avgMessages = await db.query(
        `SELECT AVG(jsonb_array_length(messages)) as avg_messages FROM conversations WHERE bot_id = $1`,
        [botId]
      );

      // Drop-offs: conversations without leads
      const totalConvsCount = parseInt(totalConvs.rows[0].count);
      const conversionsCount = parseInt(conversions.rows[0].count);
      const dropOffs = totalConvsCount - conversionsCount;

      const conversionRate =
        totalConvsCount > 0 ? ((conversionsCount / totalConvsCount) * 100).toFixed(1) : 0;

      // Leads over time (last 30 days)
      const leadsOverTime = await db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM leads WHERE bot_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY date`,
        [botId]
      );

      // Conversations over time (last 30 days)
      const convsOverTime = await db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM conversations WHERE bot_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY date`,
        [botId]
      );

      // Per-stage drop-off analysis
      let stageDropOff = [];
      try {
        const stageResult = await db.query(
          `SELECT s.stage, COUNT(*) as count
           FROM sessions s
           INNER JOIN conversations c ON c.id = s.conversation_id
           WHERE c.bot_id = $1
           GROUP BY s.stage
           ORDER BY CASE s.stage
             WHEN 'START' THEN 1
             WHEN 'ASK_NAME' THEN 2
             WHEN 'ASK_PHONE' THEN 3
             WHEN 'COMPLETE' THEN 4
           END`,
          [botId]
        );
        stageDropOff = stageResult.rows;
      } catch {
        // sessions table might not exist yet
      }

      // Total impressions (visitors who saw the widget)
      let totalImpressions = 0;
      try {
        const impressionsResult = await db.query(
          'SELECT COUNT(*) FROM bot_impressions WHERE bot_id = $1',
          [botId]
        );
        totalImpressions = parseInt(impressionsResult.rows[0].count);
      } catch {
        // bot_impressions table might not exist yet
      }

      // Impressions over time (last 30 days)
      let impressionsOverTime = [];
      try {
        const impOverTimeResult = await db.query(
          `SELECT DATE(created_at) as date, COUNT(*) as count
           FROM bot_impressions WHERE bot_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY date`,
          [botId]
        );
        impressionsOverTime = impOverTimeResult.rows;
      } catch {
        // table might not exist yet
      }

      // Sentiment breakdown
      let sentimentBreakdown = [];
      try {
        const sentimentResult = await db.query(
          `SELECT COALESCE(sentiment, 'unknown') as sentiment, COUNT(*) as count
           FROM conversations
           WHERE bot_id = $1 AND lead_id IS NOT NULL
           GROUP BY sentiment`,
          [botId]
        );
        sentimentBreakdown = sentimentResult.rows;
      } catch {
        // sentiment column might not exist
      }

      // Lead quality score (average confidence)
      const avgConfidence = await db.query(
        'SELECT AVG(confidence_score) as avg_confidence FROM leads WHERE bot_id = $1 AND confidence_score IS NOT NULL',
        [botId]
      );

      res.json({
        analytics: {
          totalImpressions,
          totalConversations: totalConvsCount,
          totalLeads: parseInt(totalLeads.rows[0].count),
          conversions: conversionsCount,
          conversionRate: parseFloat(conversionRate),
          dropOffs,
          avgMessagesPerChat: parseFloat(avgMessages.rows[0].avg_messages || 0).toFixed(1),
          avgLeadQuality: parseFloat(avgConfidence.rows[0].avg_confidence || 0).toFixed(2),
          leadsOverTime: leadsOverTime.rows,
          conversationsOverTime: convsOverTime.rows,
          impressionsOverTime,
          stageDropOff,
          sentimentBreakdown,
        },
      });
    } catch (err) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
