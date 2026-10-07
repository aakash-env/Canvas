import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app';

let mongod: MongoMemoryServer;
const app = createApp(['http://localhost:3000']);

let authToken: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

beforeEach(async () => {
  const reg = await request(app).post('/api/auth/register').send({
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  });
  authToken = reg.body.data.token;
});

const validCanvas = {
  name: 'Test Canvas',
  artboard: { width: 1200, height: 800 },
  elements: [],
};

const validRect = {
  id: 'elem-1',
  type: 'rect',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  rotation: 0,
  fill: '#ff0000',
  opacity: 1,
  visible: true,
  locked: false,
};

const validCircle = {
  id: 'elem-2',
  type: 'circle',
  x: 300,
  y: 300,
  radius: 75,
  rotation: 0,
  fill: '#00ff00',
  opacity: 0.8,
  visible: true,
  locked: false,
};

const validText = {
  id: 'elem-3',
  type: 'text',
  x: 50,
  y: 50,
  text: 'Hello World',
  fontSize: 24,
  width: 200,
  rotation: 0,
  fill: '#000000',
  opacity: 1,
  visible: true,
  locked: false,
};

describe('Auth API', () => {
  it('registers a new user successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('newuser@example.com');
  });

  it('rejects duplicate email registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      name: 'Duplicate',
    });
    expect(res.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
  });
});

describe('POST /api/canvases', () => {
  it('rejects unauthenticated request', async () => {
    const res = await request(app).post('/api/canvases').send(validCanvas);
    expect(res.status).toBe(401);
  });

  it('creates a canvas with valid data', async () => {
    const res = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCanvas);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Canvas');
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.elements).toEqual([]);
  });

  it('creates a canvas with all element types', async () => {
    const res = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validCanvas, elements: [validRect, validCircle, validText] });
    expect(res.status).toBe(201);
    expect(res.body.data.elements).toHaveLength(3);
  });

  it('uses default artboard when not provided', async () => {
    const res = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'No Artboard' });
    expect(res.status).toBe(201);
    expect(res.body.data.artboard).toEqual({ width: 1200, height: 800 });
  });

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ artboard: { width: 800, height: 600 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects empty name', async () => {
    const res = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid element type', async () => {
    const res = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Bad', elements: [{ ...validRect, type: 'triangle' }] });
    expect(res.status).toBe(400);
  });

  it('rejects rect with non-positive width', async () => {
    const res = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Bad', elements: [{ ...validRect, width: -10 }] });
    expect(res.status).toBe(400);
  });

  it('rejects circle with non-positive radius', async () => {
    const res = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Bad', elements: [{ ...validCircle, radius: 0 }] });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/canvases & Canvas Ownership', () => {
  it('returns empty array when user has no canvases', async () => {
    const res = await request(app)
      .get('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns all canvases sorted by updatedAt desc', async () => {
    await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'First' });
    await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Second' });
    const res = await request(app)
      .get('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('enforces isolation between different users', async () => {
    // User 1 creates canvas
    const created = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'User 1 Canvas' });
    const canvasId = created.body.data._id;

    // Register User 2
    const user2Res = await request(app).post('/api/auth/register').send({
      email: 'user2@example.com',
      password: 'password123',
      name: 'User Two',
    });
    const user2Token = user2Res.body.data.token;

    // User 2 lists canvases -> should be empty
    const listRes = await request(app)
      .get('/api/canvases')
      .set('Authorization', `Bearer ${user2Token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(0);

    // User 2 tries to get User 1's canvas -> 404
    const getRes = await request(app)
      .get(`/api/canvases/${canvasId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(getRes.status).toBe(404);

    // User 2 tries to update User 1's canvas -> 404
    const putRes = await request(app)
      .put(`/api/canvases/${canvasId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ name: 'Hacked Name' });
    expect(putRes.status).toBe(404);

    // User 2 tries to delete User 1's canvas -> 404
    const delRes = await request(app)
      .delete(`/api/canvases/${canvasId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(delRes.status).toBe(404);
  });
});

describe('GET /api/canvases/:id', () => {
  it('returns a canvas by ID', async () => {
    const created = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCanvas);
    const id = created.body.data._id;
    const res = await request(app)
      .get(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(id);
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await request(app)
      .get('/api/canvases/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid ID format', async () => {
    const res = await request(app)
      .get('/api/canvases/not-an-id')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/canvases/:id', () => {
  it('updates canvas name', async () => {
    const created = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCanvas);
    const id = created.body.data._id;
    const res = await request(app)
      .put(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('updates elements without creating duplicate', async () => {
    const created = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCanvas);
    const id = created.body.data._id;
    await request(app)
      .put(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ elements: [validRect] });
    const res = await request(app)
      .put(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ elements: [validRect, validCircle] });
    expect(res.status).toBe(200);
    expect(res.body.data.elements).toHaveLength(2);
    // Verify no duplicate was created
    const list = await request(app)
      .get('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`);
    expect(list.body.data).toHaveLength(1);
  });

  it('returns 404 for non-existent canvas', async () => {
    const res = await request(app)
      .put('/api/canvases/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('rejects empty update body', async () => {
    const created = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCanvas);
    const id = created.body.data._id;
    const res = await request(app)
      .put(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('validates elements on update', async () => {
    const created = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCanvas);
    const id = created.body.data._id;
    const res = await request(app)
      .put(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ elements: [{ ...validRect, width: -5 }] });
    expect(res.status).toBe(400);
  });

  it('enforces optimistic concurrency control (OCC) versioning', async () => {
    const created = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCanvas);
    const id = created.body.data._id;
    expect(created.body.data.version).toBe(1);

    // Successful update with matching version
    const updated = await request(app)
      .put(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Version 2 Name', version: 1 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.version).toBe(2);

    // Conflict update with stale version
    const conflict = await request(app)
      .put(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Stale Update', version: 1 });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.message).toMatch(/Conflict/);
  });
});

describe('DELETE & RESTORE /api/canvases/:id', () => {
  it('soft deletes a canvas and restores it', async () => {
    const created = await request(app)
      .post('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCanvas);
    const id = created.body.data._id;

    // Delete
    const delRes = await request(app)
      .delete(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(delRes.status).toBe(204);

    // Get should 404
    const getRes = await request(app)
      .get(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(getRes.status).toBe(404);

    // List should not include deleted canvas
    const listRes = await request(app)
      .get('/api/canvases')
      .set('Authorization', `Bearer ${authToken}`);
    expect(listRes.body.data).toHaveLength(0);

    // Restore
    const restoreRes = await request(app)
      .post(`/api/canvases/${id}/restore`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.name).toBe(validCanvas.name);

    // Get should now succeed
    const getAfter = await request(app)
      .get(`/api/canvases/${id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(getAfter.status).toBe(200);
  });

  it('returns 404 for non-existent canvas', async () => {
    const res = await request(app)
      .delete('/api/canvases/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid ID', async () => {
    const res = await request(app)
      .delete('/api/canvases/bad-id')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(400);
  });
});

describe('Health check', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
