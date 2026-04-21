require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function setupDB() {
  console.log('Connecting to PostgreSQL...');
  
  // Connect to the default 'postgres' database first to create 'graviq' if it doesn't exist
  // We parse the DATABASE_URL to get the base connection
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbName = dbUrl.pathname.replace('/', '');
  
  // Use the connection URL but connect to the default 'postgres' database temporarily
  dbUrl.pathname = '/postgres';
  
  let adminClient = new Client({ connectionString: dbUrl.toString() });
  
  try {
    await adminClient.connect();
    
    // Check if the graviq database exists
    const res = await adminClient.query(`SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower('${dbName}')`);
    if (res.rowCount === 0) {
      console.log(`Database '${dbName}' not found. Creating it...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database '${dbName}' created successfully.`);
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err.message);
    console.log('Ensure your Postgres server is running and the password in .env is correct.');
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // Now connect to the actual graviq database and run the schema
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    console.log(`Connecting to '${dbName}' to run schema...`);
    await client.connect();
    
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running schema.sql...');
    await client.query(schemaSql);
    console.log('Schema imported successfully!');
    
    // Also run the auth migrations used by existing installs.
    console.log('Running auth migrations...');
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
      ON users(google_id)
      WHERE google_id IS NOT NULL;
    `);
    await client.query(`
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
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_user_purpose
      ON auth_otp_challenges(user_id, purpose);
    `);
    await client.query(`UPDATE users SET is_verified = true;`);
    console.log('Migration completed.');
    
    console.log('\n✅ Database setup is completely finished! You should now be able to Signup and Login.');
    
  } catch (err) {
    console.error('Error importing schema:', err);
  } finally {
    await client.end();
  }
}

setupDB();
