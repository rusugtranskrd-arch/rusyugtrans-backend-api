import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const queryMock = vi.fn();
process.env.JWT_SECRET = 'test_secret';

vi.mock('../src/db.js', () => ({
  closePool: vi.fn(),
  query: queryMock,
  testConnection: vi.fn()
}));

const { default: app } = await import('../src/server.js');

const mobileUser = {
  id: '15',
  name: 'User +79991234567',
  email: '79991234567@mobile.rusyugtrans.local',
  phone_e164: '+79991234567',
  created_at: '2026-05-01T14:00:00.000Z',
  updated_at: '2026-05-01T14:00:00.000Z'
};

describe('Mobile auth API', () => {
  beforeEach(() => {
    queryMock.mockReset();
    delete process.env.MOBILE_AUTH_AUTO_CONFIRM;
  });

  it('POST /api/mobile/auth/request-call creates a pending verification request without registering', async () => {
    const res = await request(app)
      .post('/api/mobile/auth/request-call')
      .send({ phone: '+7 (999) 123-45-67' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      phoneE164: '+79991234567',
      requestToken: expect.any(String),
      expiresAt: expect.any(String),
      callNumberE164: '+74995503212',
      status: 'pending',
      devCode: null
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('GET /api/mobile/auth/call-status stays pending by default', async () => {
    const res = await request(app).get('/api/mobile/auth/call-status?phone=%2B79991234567');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      phoneE164: '+79991234567',
      verified: false,
      status: 'pending',
      expiresAt: expect.any(String),
      authToken: null,
      detectedCallerE164: null,
      detectedIpPhoneLogId: null
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('GET /api/mobile/auth/call-status can auto-confirm when explicitly enabled', async () => {
    process.env.MOBILE_AUTH_AUTO_CONFIRM = 'true';
    queryMock.mockResolvedValueOnce({ rows: [mobileUser] });

    const res = await request(app).get('/api/mobile/auth/call-status?phone=%2B79991234567');

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.authToken).toEqual(expect.any(String));
  });

  it('auto-confirmed mobile auth token works with /api/mobile/auth/me via X-Auth-Token', async () => {
    process.env.MOBILE_AUTH_AUTO_CONFIRM = 'true';
    queryMock.mockResolvedValueOnce({ rows: [mobileUser] });
    queryMock.mockResolvedValueOnce({ rows: [mobileUser] });

    const requestCall = await request(app)
      .post('/api/mobile/auth/request-call')
      .send({ phone: '+79991234567' });

    const status = await request(app).get(
      `/api/mobile/auth/call-status?phone=%2B79991234567&requestToken=${encodeURIComponent(
        requestCall.body.requestToken
      )}`
    );

    const me = await request(app)
      .get('/api/mobile/auth/me')
      .set('X-Auth-Token', status.body.authToken);

    expect(status.status).toBe(200);
    expect(status.body.verified).toBe(true);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ user: mobileUser });
  });

  it('POST /api/mobile/auth/request-call validates phone', async () => {
    const res = await request(app).post('/api/mobile/auth/request-call').send({ phone: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Valid phone is required' });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
