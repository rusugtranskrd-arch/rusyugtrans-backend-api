import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const queryMock = vi.fn();
process.env.JWT_SECRET = 'test_secret';

vi.mock('../src/db.js', () => ({
  closePool: vi.fn(),
  query: queryMock,
  testConnection: vi.fn()
}));

const { default: app } = await import('../src/server.js');

const authHeader = () => `Bearer ${jwt.sign({ sub: '1', email: 'test@example.com' }, process.env.JWT_SECRET)}`;

describe('Users API', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('GET /users returns users from the database', async () => {
    const users = [
      {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2026-05-01T14:00:00.000Z',
        updated_at: '2026-05-01T14:00:00.000Z'
      }
    ];

    queryMock.mockResolvedValueOnce({ rows: users });

    const res = await request(app).get('/users').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ users });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('FROM users'));
  });

  it('GET /users requires a token', async () => {
    const res = await request(app).get('/users');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication token is required' });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('GET /me returns the authenticated user', async () => {
    const user = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      created_at: '2026-05-01T14:00:00.000Z',
      updated_at: '2026-05-01T14:00:00.000Z'
    };

    queryMock.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app).get('/me').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['1']);
  });

  it('GET /api/mobile/auth/me returns the authenticated user', async () => {
    const user = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      created_at: '2026-05-01T14:00:00.000Z',
      updated_at: '2026-05-01T14:00:00.000Z'
    };

    queryMock.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app).get('/api/mobile/auth/me').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['1']);
  });

  it('GET /api/mobile/profile returns the authenticated user', async () => {
    const user = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      created_at: '2026-05-01T14:00:00.000Z',
      updated_at: '2026-05-01T14:00:00.000Z'
    };

    queryMock.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app).get('/api/mobile/profile').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['1']);
  });

  it('GET /api/mobile/auth/me requires a token', async () => {
    const res = await request(app).get('/api/mobile/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication token is required' });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('POST /users creates a user', async () => {
    const user = {
      id: '1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      created_at: '2026-05-01T14:00:00.000Z',
      updated_at: '2026-05-01T14:00:00.000Z'
    };

    queryMock.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .post('/users')
      .send({ name: ' Jane Doe ', email: 'JANE@EXAMPLE.COM' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ user });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), [
      'Jane Doe',
      'jane@example.com',
      expect.any(String)
    ]);
  });

  it('POST /users validates required fields', async () => {
    const res = await request(app).post('/users').send({ name: '', email: 'bad-email' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Name is required' });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('POST /users returns 409 for duplicate email', async () => {
    const duplicateError = new Error('duplicate key');
    duplicateError.code = '23505';
    queryMock.mockRejectedValueOnce(duplicateError);

    const res = await request(app).post('/users').send({
      name: 'Jane Doe',
      email: 'jane@example.com'
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'User with this email already exists' });
  });
});
