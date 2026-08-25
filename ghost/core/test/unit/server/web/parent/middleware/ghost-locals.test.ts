import assert from 'node:assert/strict';
import { assertExists } from '../../../../../utils/assertions';
import express from 'express';
import request from 'supertest';
import { ghostLocals } from '../../../../../../core/server/web/parent/middleware/ghost-locals';

describe('ghostLocals middleware', function () {
  const app = express();
  app.use(ghostLocals);
  app.get('/awesome-post', (_req, res) => {
    res.json(res.locals);
  });

  it('sets all locals', async function () {
    const { body } = await request(app).get('/awesome-post');
    assertExists(body.version);
    assertExists(body.safeVersion);
    assert.equal(body.relativeUrl, '/awesome-post');
  });
});
