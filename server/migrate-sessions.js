const db = require('./db');

async function addSessionsTable() {
  try {
    console.log('Adding sessions table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
        name VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        stage VARCHAR(20) NOT NULL DEFAULT 'START',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await db.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id ON sessions(conversation_id);
    `);

    console.log('✓ Sessions table created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

addSessionsTable();
