import { query } from './db.js';

const disabledPasswordHash = '$2b$10$w1pHFQuk0hMIAV5C4/04qO1z3t8Flc27.rSfN9ztxarEGgY9g2luS';

const normalizeUserInput = (body) => ({
  name: typeof body.name === 'string' ? body.name.trim() : '',
  email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
});

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const listUsers = async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, created_at, updated_at
       FROM users
       ORDER BY created_at DESC, id DESC`
    );

    res.status(200).json({ users: result.rows });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email } = normalizeUserInput(req.body || {});

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const result = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at, updated_at`,
      [name, email, disabledPasswordHash]
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    return next(err);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
};
