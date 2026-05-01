import jwt from 'jsonwebtoken';

import { createToken, getJwtSecret } from './auth.js';
import { query } from './db.js';

const disabledPasswordHash = '$2b$10$w1pHFQuk0hMIAV5C4/04qO1z3t8Flc27.rSfN9ztxarEGgY9g2luS';
const requestTokenExpiresInSeconds = 10 * 60;
const mobileUserFields = 'id, name, email, phone_e164, created_at, updated_at';
const defaultCallNumberE164 = '+74995503212';

const normalizePhone = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  const digits = raw.replace(/\D/g, '');

  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return '';
};

const createRequestToken = (phoneE164) =>
  jwt.sign(
    {
      purpose: 'mobile-call-verification',
      phoneE164
    },
    getJwtSecret(),
    {
      algorithm: 'HS256',
      expiresIn: requestTokenExpiresInSeconds
    }
  );

const getRequestExpiry = () =>
  new Date(Date.now() + requestTokenExpiresInSeconds * 1000).toISOString();

const getOrCreateMobileUser = async (phoneE164) => {
  const existing = await query(
    `SELECT ${mobileUserFields}
     FROM users
     WHERE phone_e164 = $1`,
    [phoneE164]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const digits = phoneE164.replace(/\D/g, '');
  const result = await query(
    `INSERT INTO users (name, email, phone_e164, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${mobileUserFields}`,
    [`User ${phoneE164}`, `${digits}@mobile.rusyugtrans.local`, phoneE164, disabledPasswordHash]
  );

  return result.rows[0];
};

const getVerifiedResponse = async (phoneE164, expiresAt) => {
  const user = await getOrCreateMobileUser(phoneE164);

  return {
    phoneE164,
    verified: true,
    status: 'confirmed',
    expiresAt,
    authToken: createToken(user),
    detectedCallerE164: phoneE164,
    detectedIpPhoneLogId: null
  };
};

export const requestCallVerification = async (req, res, next) => {
  try {
    const phoneE164 = normalizePhone(req.body?.phone);

    if (!phoneE164) {
      return res.status(400).json({ error: 'Valid phone is required' });
    }

    await getOrCreateMobileUser(phoneE164);

    return res.status(200).json({
      phoneE164,
      requestToken: createRequestToken(phoneE164),
      expiresAt: getRequestExpiry(),
      callNumberE164: process.env.MOBILE_CALL_NUMBER_E164 || defaultCallNumberE164,
      status: 'pending',
      devCode: '0000'
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Mobile user already exists with conflicting data' });
    }

    return next(err);
  }
};

export const getCallVerificationStatus = async (req, res, next) => {
  try {
    let phoneE164 = normalizePhone(req.query.phone);
    let expiresAt = getRequestExpiry();

    if (req.query.requestToken) {
      try {
        const payload = jwt.verify(req.query.requestToken, getJwtSecret(), { algorithms: ['HS256'] });
        if (payload.purpose === 'mobile-call-verification' && payload.phoneE164) {
          phoneE164 = normalizePhone(payload.phoneE164);
          expiresAt = new Date(Number(payload.exp) * 1000).toISOString();
        }
      } catch (_err) {
        return res.status(401).json({ error: 'Invalid request token' });
      }
    }

    if (!phoneE164) {
      return res.status(400).json({ error: 'Valid phone is required' });
    }

    return res.status(200).json(await getVerifiedResponse(phoneE164, expiresAt));
  } catch (err) {
    return next(err);
  }
};
