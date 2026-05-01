import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const queryMock = vi.fn();

vi.mock('../src/db.js', () => ({
  closePool: vi.fn(),
  query: queryMock,
  testConnection: vi.fn()
}));

const { default: app } = await import('../src/server.js');

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

    const res = await request(app).get('/users');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ users });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('FROM users'));
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
      'jane@example.com'
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
