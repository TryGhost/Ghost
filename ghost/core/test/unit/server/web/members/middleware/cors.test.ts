import express from 'express';
import request from 'supertest';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../../../../../utils/config-utils';
// @ts-expect-error This module lacks type definitions.
import cors from '../../../../../../core/server/web/members/middleware/cors';

describe('members cors middleware', function () {
  const app = express();
  app.use(cors);

  afterEach(async function () {
    await configUtils.restore();
  });

  it('should return wildcard without a request origin header', async function () {
    await request(app).options('/').expect('Access-Control-Allow-Origin', '*');
  });

  it('should be enabled when origin matches config.url host', async function () {
    configUtils.set({ url: 'https://my.blog' });

    const origin = 'http://my.blog';
    await request(app)
      .options('/')
      .set('Origin', origin)
      .expect('Access-Control-Allow-Origin', origin);
  });

  it('should be enabled when origin matches config.admin.url host', async function () {
    configUtils.set({
      url: 'https://my.blog',
      admin: {
        url: 'https://admin.my.blog',
      },
    });

    const origin = 'http://admin.my.blog';
    await request(app)
      .options('/')
      .set('Origin', origin)
      .expect('Access-Control-Allow-Origin', origin);
  });

  it('should return wildcard for origins outside of config.url and config.admin.url', async function () {
    configUtils.set({
      url: 'https://my.blog',
      admin: {
        url: 'https://admin.my.blog',
      },
    });

    await request(app)
      .options('/')
      .set('Origin', 'http://not-trusted.com')
      .expect('Access-Control-Allow-Origin', '*');
  });

  it('should return wildcard for invalid origins', async function () {
    configUtils.set({
      url: 'https://my.blog',
      admin: {
        url: 'https://admin.my.blog',
      },
    });

    await request(app)
      .options('/')
      .set('Origin', '://not-valid-origin')
      .expect('Access-Control-Allow-Origin', '*');
  });
});
