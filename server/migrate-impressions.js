/**
 * Migration: Add bot_impressions table and email column to sessions.
 * Run: node migrate-impressions.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('./db');

async function migrate() {
  console.log('Running impressions & sessions migration...');

  try {
    // Add bot_impressions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bot_impressions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        source_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ bot_impressions table created');

    // Add index
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_bot_impressions_bot_id ON bot_impressions(bot_id);
    `);
    console.log('✅ bot_impressions index created');

    // Add email column to sessions if not present
    try {
      await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
      console.log('✅ email column added to sessions');
    } catch (err) {
      if (err.code === '42701') {
        console.log('ℹ️  email column already exists on sessions');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
