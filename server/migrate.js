require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Add auth-related columns safely.
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
    `);

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
      ON users(google_id)
      WHERE google_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_otp_challenges (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose VARCHAR(32) NOT NULL,
        otp_hash VARCHAR(64) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_user_purpose
      ON auth_otp_challenges(user_id, purpose);
    `);

    await pool.query(`
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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id
      ON sessions(conversation_id);
    `);

    await pool.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);

    // Set existing users to true so they aren't locked out immediately.
    await pool.query(`
      UPDATE users SET is_verified = true;
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

runMigration();
