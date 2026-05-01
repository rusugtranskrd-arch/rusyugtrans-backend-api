import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const query = (text, params) => pool.query(text, params);

export const testConnection = async () => {
  await pool.query('SELECT 1');
  console.log('PostgreSQL connected');
};

export const closePool = () => pool.end();
