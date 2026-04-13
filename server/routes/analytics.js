const express = require('express');
const { param, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

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

      res.json({
        analytics: {
          totalConversations: totalConvsCount,
          totalLeads: parseInt(totalLeads.rows[0].count),
          conversions: conversionsCount,
          conversionRate: parseFloat(conversionRate),
          dropOffs,
          avgMessagesPerChat: parseFloat(avgMessages.rows[0].avg_messages || 0).toFixed(1),
          leadsOverTime: leadsOverTime.rows,
          conversationsOverTime: convsOverTime.rows,
        },
      });
    } catch (err) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
