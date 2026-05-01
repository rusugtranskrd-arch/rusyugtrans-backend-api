import { query } from './db.js';

const disabledPasswordHash = '$2b$10$w1pHFQuk0hMIAV5C4/04qO1z3t8Flc27.rSfN9ztxarEGgY9g2luS';

export const initializeSchema = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone_e164 TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_e164 TEXT');
  await query(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_phone_e164_unique ON users (phone_e164) WHERE phone_e164 IS NOT NULL'
  );
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
  await query('UPDATE users SET password_hash = $1 WHERE password_hash IS NULL', [disabledPasswordHash]);
  await query('ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL');
};
