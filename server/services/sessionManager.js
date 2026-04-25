const db = require('../db');
const { validateName, validatePhone, validateEmail } = require('./leadValidator');

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
async function updateSession(sessionId, userMessage, currentStage, conversationId) {
  const updates = { stage: currentStage };

  // Always try to extract email opportunistically from any message
  const email = extractEmail(userMessage);
  if (email && validateEmail(email)) {
    updates.email = email;
  }

  switch (currentStage) {
    case STAGES.START:
      // Stay in START for at least 2 exchanges to build rapport
      const conv = await db.query(
        'SELECT messages FROM conversations WHERE id = $1',
        [conversationId]
      );
      const messageCount = (conv.rows[0].messages || []).length;
      
      // Move to ASK_NAME after 3+ messages (including bot responses)
      if (messageCount >= 3) {
        updates.stage = STAGES.ASK_NAME;
      }
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
         email = COALESCE($3, email),
         stage = $4, 
         updated_at = NOW() 
     WHERE id = $5 
     RETURNING *`,
    [updates.name, updates.phone, updates.email, updates.stage, sessionId]
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

/**
 * Extract email from user message
 */
function extractEmail(message) {
  const emailMatch = message.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    return emailMatch[0].toLowerCase();
  }
  return null;
}

module.exports = {
  STAGES,
  getOrCreateSession,
  updateSession
};
