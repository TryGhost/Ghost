import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type ComposeConfig, hostOverlayEnv } from '../lib/dev-compose.ts';

const baseEnv = { mail__options__host: 'mailpit', server__port: '2368' };
const base: ComposeConfig = {
  services: { 'ghost-dev': { environment: baseEnv }, mailpit: {} },
};

function withOverlay(environment: Record<string, string | null>): ComposeConfig {
  return {
    services: {
      'ghost-dev': { environment: { ...baseEnv, ...environment } },
      mailpit: {},
      analytics: { ports: [{ target: 3000, published: '7182' }] },
      'tinybird-local': { ports: [{ target: 7181, published: '7181' }] },
      versitygw: { ports: [{ target: 9000, published: '9000' }] },
      'fake-mailgun': {},
    },
  };
}

describe('hostOverlayEnv', () => {
  it('returns only what the overlays add to the ghost-dev environment', () => {
    const config = withOverlay({ mail__transport: 'mailgun', bulkEmail__mailgun__domain: null });
    assert.deepEqual(hostOverlayEnv(base, config, '2660'), { mail__transport: 'mailgun' });
  });

  it('points service URLs at the ports they publish on the host', () => {
    const config = withOverlay({
      analytics__url: 'http://analytics:3000',
      storage__S3Storage__endpoint: 'http://versitygw:9000',
      tinybird__stats__endpoint: 'http://tinybird-local:7181',
      mail__options__url: 'https://api.mailgun.net',
    });
    assert.deepEqual(hostOverlayEnv(base, config, '2660'), {
      analytics__url: 'http://127.0.0.1:7182',
      storage__S3Storage__endpoint: 'http://127.0.0.1:9000',
      tinybird__stats__endpoint: 'http://127.0.0.1:7181',
      mail__options__url: 'https://api.mailgun.net',
    });
  });

  it('replaces bare service names in host settings only', () => {
    const config = withOverlay({
      TB_LOCAL_HOST: 'tinybird-local',
      storage__S3Storage__bucket: 'ghost-dev',
    });
    assert.deepEqual(hostOverlayEnv(base, config, '2660'), {
      TB_LOCAL_HOST: '127.0.0.1',
      storage__S3Storage__bucket: 'ghost-dev',
    });
  });

  it("moves the gateway's port to the checkout's front door", () => {
    const config = withOverlay({
      tinybird__tracker__endpoint: 'http://localhost:2368/.ghost/analytics/api/v1/page_hit',
      tinybird__stats__endpointBrowser: 'http://localhost:7181',
      urls__media: 'http://127.0.0.1:9000/ghost-dev/media',
    });
    assert.deepEqual(hostOverlayEnv(base, config, '2660'), {
      tinybird__tracker__endpoint: 'http://localhost:2660/.ghost/analytics/api/v1/page_hit',
      tinybird__stats__endpointBrowser: 'http://localhost:7181',
      urls__media: 'http://127.0.0.1:9000/ghost-dev/media',
    });
  });

  it('fails for a service port that is not published', () => {
    const config = withOverlay({ bulkEmail__mailgun__baseUrl: 'http://fake-mailgun:4010/v3' });
    assert.throws(
      () => hostOverlayEnv(base, config, '2660'),
      /fake-mailgun:4010 has to be published/,
    );
  });
});
