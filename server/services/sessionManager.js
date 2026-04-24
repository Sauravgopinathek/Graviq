const db = require('../db');
const { validateName, validatePhone } = require('./leadValidator');

const STAGES = {
  START: 'START',
  ASK_NAME: 'ASK_NAME',
  ASK_PHONE: 'ASK_PHONE',
  COMPLETE: 'COMPLETE'
};

/**
 * Get or create session for a conversation
 */
async function getOrCreateSession(conversationId) {
  const result = await db.query(
    'SELECT * FROM sessions WHERE conversation_id = $1',
    [conversationId]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const newSession = await db.query(
    `INSERT INTO sessions (conversation_id, stage) 
     VALUES ($1, $2) 
     RETURNING *`,
    [conversationId, STAGES.START]
  );

  return newSession.rows[0];
}

/**
 * Update session based on user message
 */
async function updateSession(sessionId, userMessage, currentStage) {
  const updates = { stage: currentStage };

  switch (currentStage) {
    case STAGES.START:
      updates.stage = STAGES.ASK_NAME;
      break;

    case STAGES.ASK_NAME:
      const name = extractName(userMessage);
      if (name && validateName(name)) {
        updates.name = name;
        updates.stage = STAGES.ASK_PHONE;
      }
      break;

    case STAGES.ASK_PHONE:
      const phone = extractPhone(userMessage);
      if (phone && validatePhone(phone)) {
        updates.phone = phone;
        updates.stage = STAGES.COMPLETE;
      }
      break;

    case STAGES.COMPLETE:
      // Stay in COMPLETE
      break;
  }

  const result = await db.query(
    `UPDATE sessions 
     SET name = COALESCE($1, name), 
         phone = COALESCE($2, phone), 
         stage = $3, 
         updated_at = NOW() 
     WHERE id = $4 
     RETURNING *`,
    [updates.name, updates.phone, updates.stage, sessionId]
  );

  return result.rows[0];
}

/**
 * Extract name from user message
 */
function extractName(message) {
  const trimmed = message.trim();
  if (trimmed.length >= 2 && trimmed.length <= 50 && /^[a-zA-Z\s'\-]+$/.test(trimmed)) {
    const words = trimmed.split(/\s+/);
    if (words.length <= 3) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Extract phone from user message
 */
function extractPhone(message) {
  const phoneMatch = message.match(/(?:\+?\d[\d\s\-\(\)\.]{6,15}\d)/);
  if (phoneMatch) {
    return phoneMatch[0].replace(/[\s\-\(\)\.]/g, '');
  }
  return null;
}

module.exports = {
  STAGES,
  getOrCreateSession,
  updateSession
};
