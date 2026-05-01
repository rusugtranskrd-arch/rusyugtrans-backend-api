import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { query } from './db.js';

const tokenExpiresIn = '1h';
const publicUserFields = 'id, name, email, created_at, updated_at';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }

  return secret;
};

const normalizeCredentials = (body) => ({
  name: typeof body.name === 'string' ? body.name.trim() : '',
  email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
  password: typeof body.password === 'string' ? body.password : ''
});

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const createToken = (user) =>
  jwt.sign(
    {
      sub: String(user.id),
      email: user.email
    },
    getJwtSecret(),
    {
      algorithm: 'HS256',
      expiresIn: tokenExpiresIn
    }
  );

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = normalizeCredentials(req.body || {});

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${publicUserFields}`,
      [name, email, passwordHash]
    );

    const user = result.rows[0];

    return res.status(201).json({
      user,
      token: createToken(user)
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    return next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = normalizeCredentials(req.body || {});

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      `SELECT id, name, email, password_hash, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.status(200).json({ token: createToken(user) });
  } catch (err) {
    return next(err);
  }
};

export const authMiddleware = (req, res, next) => {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    req.user = {
      id: payload.sub,
      email: payload.email
    };
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};
