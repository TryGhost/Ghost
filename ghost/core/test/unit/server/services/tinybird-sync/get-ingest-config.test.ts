import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { getIngestConfig } from '../../../../../core/server/services/tinybird-sync/get-ingest-config';

const createDependencies = (values: Record<string, unknown>) => ({
  config: { get: (key: string) => values[key] },
  settingsCache: { get: () => 'settings-site-uuid' },
});

describe('getIngestConfig', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])(
    'routes development loopback tracker URLs through the gateway: %s',
    (hostname) => {
      const dependencies = createDependencies({
        env: 'development',
        'tinybird:tracker:endpoint': `http://${hostname}:2368/blog/.ghost/analytics/api/v1/page_hit`,
        'tinybird:sync_auth_key': 'sync-secret',
      });

      assert.equal(
        getIngestConfig(dependencies)?.endpoint.href,
        'http://ghost-dev-gateway/blog/.ghost/analytics/api/v1/tinybird-sync',
      );
    },
  );

  it.each([
    ['production', 'http://localhost:2368'],
    ['development', 'https://example.com'],
  ])('preserves the tracker origin for %s at %s', (env, origin) => {
    const dependencies = createDependencies({
      env,
      'tinybird:tracker:endpoint': `${origin}/.ghost/analytics/api/v1/page_hit`,
      'tinybird:sync_auth_key': 'sync-secret',
    });

    assert.equal(
      getIngestConfig(dependencies)?.endpoint.href,
      `${origin}/.ghost/analytics/api/v1/tinybird-sync`,
    );
  });

  it('builds the sync endpoint and reads the configured Tinybird site UUID', () => {
    const dependencies = createDependencies({
      'tinybird:tracker:endpoint': 'https://example.com/foo/.ghost/analytics/bar',
      'tinybird:sync_auth_key': 'sync-secret',
      'tinybird:stats': { id: 'configured-site-uuid' },
    });

    const ingestConfig = getIngestConfig(dependencies);
    assert.ok(ingestConfig);
    assert.equal(
      ingestConfig.endpoint.href,
      'https://example.com/foo/.ghost/analytics/api/v1/tinybird-sync',
    );
    assert.deepEqual(
      {
        trafficAnalyticsAuth: ingestConfig.trafficAnalyticsAuth,
        siteUuid: ingestConfig.siteUuid,
      },
      {
        trafficAnalyticsAuth: 'sync-secret',
        siteUuid: 'configured-site-uuid',
      },
    );
  });

  it('falls back to settings site UUID', () => {
    const dependencies = createDependencies({
      'tinybird:tracker:endpoint': 'https://example.com/.ghost/analytics/api/v1/page_hit',
      'tinybird:sync_auth_key': 'sync-secret',
    });

    assert.equal(getIngestConfig(dependencies)?.siteUuid, 'settings-site-uuid');
  });

  it.each(['invalid', 'https://analytics.example.com/api/v1/page_hit'])(
    'rejects invalid tracker endpoint: %j',
    (trackerEndpoint) => {
      const dependencies = createDependencies({
        'tinybird:tracker:endpoint': trackerEndpoint,
        'tinybird:sync_auth_key': 'sync-secret',
      });

      assert.equal(getIngestConfig(dependencies), null);
    },
  );

  it.each([undefined, '', 42])('rejects invalid sync auth key: %j', (syncAuthKey) => {
    const dependencies = createDependencies({
      'tinybird:tracker:endpoint': 'https://example.com/.ghost/analytics/api/v1/page_hit',
      'tinybird:sync_auth_key': syncAuthKey,
    });

    assert.equal(getIngestConfig(dependencies), null);
  });
});
