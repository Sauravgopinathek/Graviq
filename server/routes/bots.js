const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function getWidgetBaseUrl(req) {
  const configuredBaseUrl = process.env.WIDGET_BASE_URL || process.env.PUBLIC_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  return `${req.protocol}://${req.get('host')}`;
}

// All bot routes require authentication
router.use(authMiddleware);

// GET /api/bots — list user's bots
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, config, domains, created_at, updated_at FROM bots WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ bots: result.rows });
  } catch (err) {
    console.error('List bots error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/bots — create bot
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Bot name is required'),
    body('config').isObject().withMessage('Config must be an object'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, config, domains } = req.body;

    try {
      const result = await db.query(
        'INSERT INTO bots (user_id, name, config, domains) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.id, name, JSON.stringify(config), domains || []]
      );
      res.status(201).json({ bot: result.rows[0] });
    } catch (err) {
      console.error('Create bot error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/bots/:id — get bot
router.get('/:id', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await db.query(
      'SELECT * FROM bots WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    res.json({ bot: result.rows[0] });
  } catch (err) {
    console.error('Get bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/bots/:id — update bot
router.put(
  '/:id',
  [param('id').isUUID(), body('name').optional().trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, config, domains } = req.body;

    try {
      // Verify ownership
      const existing = await db.query('SELECT id FROM bots WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user.id,
      ]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const fields = [];
      const values = [];
      let idx = 1;

      if (name) {
        fields.push(`name = $${idx++}`);
        values.push(name);
      }
      if (config) {
        fields.push(`config = $${idx++}`);
        values.push(JSON.stringify(config));
      }
      if (domains) {
        fields.push(`domains = $${idx++}`);
        values.push(domains);
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(req.params.id);

      const result = await db.query(
        `UPDATE bots SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      res.json({ bot: result.rows[0] });
    } catch (err) {
      console.error('Update bot error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/bots/:id — delete bot
router.delete('/:id', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await db.query('DELETE FROM bots WHERE id = $1 AND user_id = $2 RETURNING id', [
      req.params.id,
      req.user.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    res.json({ message: 'Bot deleted' });
  } catch (err) {
    console.error('Delete bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bots/:id/embed — get embed code
router.get('/:id/embed', param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await db.query('SELECT id, name, config FROM bots WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const bot = result.rows[0];
    const theme = bot.config.theme || 'dark';
    const position = bot.config.position || 'bottom-right';
    const widgetBaseUrl = getWidgetBaseUrl(req);

    const embedCode = `<!-- Graviq Chat Widget -->
<script>
  window.aiLeadBot = {
    botId: "${bot.id}",
    theme: "${theme}",
    position: "${position}"
  };
</script>
<script src="${widgetBaseUrl}/widget.js"></script>`;

    res.json({ embedCode });
  } catch (err) {
    console.error('Embed code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
