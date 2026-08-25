import express, { type Express } from 'express';
import request from 'supertest';
// @ts-expect-error This module lacks type definitions.
import { cacheControl } from '../../../../../../core/server/web/shared/middleware/cache-control';

describe('Cache-Control middleware', function () {
  const createApp = (...args: Parameters<typeof cacheControl>): Express => {
    const app = express();
    app.use(cacheControl(...args));
    app.use((_req, res) => res.send('Hello world'));
    return app;
  };

  it('correctly sets public profile headers', async function () {
    await request(createApp('public')).get('/').expect('Cache-Control', 'public, max-age=0');
  });

  it('correctly sets public profile headers with custom maxAge', async function () {
    await request(createApp('public', { maxAge: 123456 }))
      .get('/')
      .expect('Cache-Control', 'public, max-age=123456');
  });

  it('correctly sets private profile headers', async function () {
    await request(createApp('private'))
      .get('/')
      .expect(
        'Cache-Control',
        'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
      );
  });

  it('correctly sets noCache profile headers', async function () {
    await request(createApp('noCache'))
      .get('/')
      .expect(
        'Cache-Control',
        'no-cache, max-age=0, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
      );
  });
});
