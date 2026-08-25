import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
// @ts-expect-error This module lacks type definitions.
import validator from '@tryghost/validator';
// @ts-expect-error This module lacks type definitions.
import requestId from '../../../../../../core/server/web/parent/middleware/request-id';

describe('Request ID middleware', function () {
  const app = express();
  app.use(requestId);
  app.get('/', (req, res) => {
    res.json({ requestId: req.requestId });
  });

  it('generates a new request ID if X-Request-ID not present', async function () {
    const { headers, body } = await request(app).get('/');
    assert(!('x-request-id' in headers));
    assert(validator.isUUID(body.requestId));
  });

  it('generates a new request ID if X-Request-ID is an empty string', async function () {
    const { headers, body } = await request(app).get('/').set('X-Request-ID', '');
    assert(!('x-request-id' in headers));
    assert(validator.isUUID(body.requestId));
  });

  it('keeps the request ID if X-Request-ID is present', async function () {
    await request(app)
      .get('/')
      .set('X-Request-ID', 'abcd')
      .expect('X-Request-ID', 'abcd')
      .expect({ requestId: 'abcd' });
  });
});
