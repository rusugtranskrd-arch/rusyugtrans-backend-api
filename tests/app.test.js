import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('Health endpoint', () => {
  it('GET / should return API metadata', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      service: 'rusyugtrans-api',
      status: 'ok',
      docs: [
        '/health',
        '/ready',
        '/users',
        '/api/mobile/auth/me',
        '/api/mobile/profile',
        '/api/mobile/map/points'
      ]
    });
  });

  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/mobile/map/points should return an empty compatible response', async () => {
    const res = await request(app).get('/api/mobile/map/points');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ points: [] });
  });
});
