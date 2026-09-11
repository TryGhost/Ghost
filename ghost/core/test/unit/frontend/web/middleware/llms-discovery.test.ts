import assert from 'node:assert/strict';
import express, { type Express } from 'express';
import request from 'supertest';
import { createLlmsDiscovery } from '../../../../../core/frontend/web/middleware/llms-discovery';

type Settings = {
  is_private?: boolean;
  llms_enabled?: boolean;
};

describe('LLMs discovery middleware', function () {
  function createApp(
    settings: Settings = {},
    existingHeaders: Record<string, string> = {},
  ): Express {
    const settingsCache = {
      get(key: keyof Settings) {
        return settings[key];
      },
    };
    const app = express();

    app.use(createLlmsDiscovery({ settingsCache }));
    app.use((_req, res) => {
      for (const [name, value] of Object.entries(existingHeaders)) {
        res.setHeader(name, value);
      }
      res.sendStatus(204);
    });

    return app;
  }

  it('adds discovery headers when enabled', async function () {
    await request(createApp({ is_private: false, llms_enabled: true }))
      .get('/')
      .expect(204)
      .expect('Link', '</llms.txt>; rel="llms-txt", </llms-full.txt>; rel="llms-full-txt"')
      .expect('X-Llms-Txt', '/llms.txt');
  });

  it('adds discovery headers when llms_enabled is unset', async function () {
    await request(createApp({ is_private: false }))
      .get('/')
      .expect(204)
      .expect('X-Llms-Txt', '/llms.txt');
  });

  it('does not add discovery headers on private sites', async function () {
    const response = await request(createApp({ is_private: true, llms_enabled: true }))
      .get('/')
      .expect(204);

    assert.equal(response.headers.link, undefined);
    assert.equal(response.headers['x-llms-txt'], undefined);
  });

  it('does not add discovery headers when disabled', async function () {
    const response = await request(createApp({ is_private: false, llms_enabled: false }))
      .get('/')
      .expect(204);

    assert.equal(response.headers.link, undefined);
    assert.equal(response.headers['x-llms-txt'], undefined);
  });

  it('preserves existing header values', async function () {
    await request(
      createApp(
        { is_private: false, llms_enabled: true },
        {
          Link: '</feed/>; rel="alternate"',
          'X-Llms-Txt': '/custom-llms.txt',
        },
      ),
    )
      .get('/')
      .expect(204)
      .expect(
        'Link',
        '</feed/>; rel="alternate", </llms.txt>; rel="llms-txt", </llms-full.txt>; rel="llms-full-txt"',
      )
      .expect('X-Llms-Txt', '/custom-llms.txt');
  });

  it('does not duplicate existing discovery links', async function () {
    await request(
      createApp(
        { is_private: false, llms_enabled: true },
        {
          Link: '</llms.txt>; rel="llms-txt", </llms-full.txt>; rel="llms-full-txt"',
        },
      ),
    )
      .get('/')
      .expect(204)
      .expect('Link', '</llms.txt>; rel="llms-txt", </llms-full.txt>; rel="llms-full-txt"');
  });
});
