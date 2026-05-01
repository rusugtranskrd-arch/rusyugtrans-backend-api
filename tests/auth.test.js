import bcrypt from 'bcryptjs';
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

describe('Auth API', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('POST /auth/register creates a user and returns a token', async () => {
    const user = {
      id: '10',
      name: 'John',
      email: 'john@example.com',
      created_at: '2026-05-01T14:00:00.000Z',
      updated_at: '2026-05-01T14:00:00.000Z'
    };

    queryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app).post('/auth/register').send({
      name: 'John',
      email: 'john@example.com',
      password: '123456'
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(user);
    expect(res.body.token).toEqual(expect.any(String));
    expect(queryMock).toHaveBeenNthCalledWith(1, 'SELECT id FROM users WHERE email = $1', [
      'john@example.com'
    ]);
    expect(queryMock.mock.calls[1][0]).toContain('INSERT INTO users');
    expect(queryMock.mock.calls[1][1][0]).toBe('John');
    expect(queryMock.mock.calls[1][1][1]).toBe('john@example.com');
    expect(queryMock.mock.calls[1][1][2]).not.toBe('123456');
  });

  it('POST /auth/register returns 409 for duplicate email', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '10' }] });

    const res = await request(app).post('/auth/register').send({
      name: 'John',
      email: 'john@example.com',
      password: '123456'
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'User with this email already exists' });
  });

  it('POST /auth/login returns a token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('123456', 12);

    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: '10',
          name: 'John',
          email: 'john@example.com',
          password_hash: passwordHash,
          created_at: '2026-05-01T14:00:00.000Z',
          updated_at: '2026-05-01T14:00:00.000Z'
        }
      ]
    });

    const res = await request(app).post('/auth/login').send({
      email: 'john@example.com',
      password: '123456'
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: expect.any(String) });
  });

  it('POST /auth/login returns 401 for a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 12);

    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: '10',
          name: 'John',
          email: 'john@example.com',
          password_hash: passwordHash,
          created_at: '2026-05-01T14:00:00.000Z',
          updated_at: '2026-05-01T14:00:00.000Z'
        }
      ]
    });

    const res = await request(app).post('/auth/login').send({
      email: 'john@example.com',
      password: 'wrong-password'
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid email or password' });
  });
});
