const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { generateReply } = require('../services/ai');
const { extractLeadInfo, validateName, validatePhone } = require('../services/leadValidator');

const router = express.Router();

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

          const hostname = parsedUrl.hostname;
          const allowed = bot.domains.some(
            (d) => hostname === d || hostname.endsWith('.' + d)
          );
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
      const messages = conversation.messages || [];

      // Add user message
      messages.push({ role: 'user', content });

      // Generate AI reply via NVIDIA
      const aiReply = await generateReply(bot.config, messages);
      messages.push({ role: 'assistant', content: aiReply });

      // Extract lead info from conversation
      const leadInfo = extractLeadInfo(messages);
      let leadId = conversation.lead_id;

      // If we captured enough info, create or update lead
      if (leadInfo.name && leadInfo.phone && validateName(leadInfo.name) && validatePhone(leadInfo.phone)) {
        if (!leadId) {
          // Create new lead
          const leadResult = await db.query(
            `INSERT INTO leads (bot_id, name, phone, email, source_url, intent, confidence_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [
              bot.id,
              leadInfo.name,
              leadInfo.phone,
              leadInfo.email,
              req.body.sourceUrl || null,
              'interested',
              0.8,
            ]
          );
          leadId = leadResult.rows[0].id;
        } else {
          // Update existing lead
          await db.query(
            'UPDATE leads SET name = $1, phone = $2, email = COALESCE($3, email) WHERE id = $4',
            [leadInfo.name, leadInfo.phone, leadInfo.email, leadId]
          );
        }
      }

      // Update conversation
      await db.query(
        'UPDATE conversations SET messages = $1, lead_id = $2, updated_at = NOW() WHERE id = $3',
        [JSON.stringify(messages), leadId, conversation.id]
      );

      // Calculate progress for gamified UI
      const capturedFields = [];
      if (leadInfo.name) capturedFields.push('name');
      if (leadInfo.phone) capturedFields.push('phone');
      if (leadInfo.email) capturedFields.push('email');

      const totalRequired = 2; // name + phone
      const progress = Math.min(capturedFields.length, totalRequired) / totalRequired;

      res.json({
        reply: aiReply,
        progress: {
          percentage: Math.round(progress * 100),
          captured: capturedFields,
          stepsLeft: totalRequired - Math.min(capturedFields.length, totalRequired),
        },
        leadCaptured: !!(leadInfo.name && leadInfo.phone),
      });
    } catch (err) {
      console.error('Message error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
