import assert from 'node:assert/strict';
import { normalizeAdapterConfig } from '../../../../../core/server/services/adapter-manager/config';
import { createConfig } from '../../../../../core/shared/config/validated';
import { configSources } from '../../../../utils/config-sources';
import type { ConfigInstance } from '../../../../../core/shared/config/loader';
import type { AdapterConfig } from '../../../../../core/kernel/adapter-manager';

// The options a named store would be constructed with, read back from the
// normalized config without assuming the type is configured.
function storeOptions(config: AdapterConfig, type: string, store: string) {
  return config[type]?.[store] as Record<string, unknown> | undefined;
}

describe('Adapter Manager: config', function () {
  describe('normalizeAdapterConfig', function () {
    // minimal stand-in for the loaded config
    function loadNconf(): ConfigInstance {
      return createConfig(configSources({ paths: { contentPath: '/some/path' } }));
    }

    it('uses top-level storage config path if adapter storage not specified', () => {
      const conf = loadNconf();
      conf.set('storage', {
        active: 'local-storage',
        'local-storage': {
          basePath: '/some/path',
        },
      });
      conf.set('adapters', {
        cache: {
          active: 'Memory',
        },
      });

      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.deepEqual(normalizedConfig.storage, {
        active: 'local-storage',
        'local-storage': {
          basePath: '/some/path',
        },
      });
    });

    it('uses top-level scheduling config path if adapter scheduling not specified', () => {
      const conf = loadNconf();
      conf.set('scheduling', {
        active: 'some-scheduler',
        schedulerUrl: 'http://scheduler',
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.deepEqual(normalizedConfig.scheduling, {
        active: 'some-scheduler',
        'some-scheduler': {
          schedulerUrl: 'http://scheduler',
        },
      });
    });

    it('normalizes redirects config by ensuring basePath is populated from content path if not explicitly provided', () => {
      const conf = loadNconf();
      conf.set('adapters', {
        redirects: {
          active: 'FileStore',
          FileStore: {
            // basePath is not provided here
          },
        },
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.deepEqual(normalizedConfig.redirects, {
        active: 'FileStore',
        FileStore: {
          basePath: conf.getContentPath('data'),
        },
      });
    });

    it('normalizes route-settings config by populating both FileStore paths from config if not explicitly provided', () => {
      const conf = loadNconf();
      conf.set('paths:defaultRouteSettings', '/default/route/settings');
      conf.set('adapters', {
        'route-settings': {
          active: 'FileStore',
          FileStore: {
            // neither path is provided here
          },
        },
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.deepEqual(normalizedConfig['route-settings'], {
        active: 'FileStore',
        FileStore: {
          basePath: conf.getContentPath('settings'),
          defaultSettingsBasePath: '/default/route/settings',
        },
      });
    });

    it('keeps explicitly configured route-settings FileStore paths', () => {
      const conf = loadNconf();
      conf.set('adapters', {
        'route-settings': {
          active: 'FileStore',
          FileStore: {
            basePath: '/custom/settings',
            defaultSettingsBasePath: '/custom/defaults',
          },
        },
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.deepEqual(normalizedConfig['route-settings'], {
        active: 'FileStore',
        FileStore: {
          basePath: '/custom/settings',
          defaultSettingsBasePath: '/custom/defaults',
        },
      });
    });

    // The shape every install now boots with: both stores present, one of
    // them active. Asserted as a whole slice so filling in one store's paths
    // can't quietly disturb the other's.
    it('populates the paths of both route-settings stores from config if not explicitly provided', () => {
      const conf = loadNconf();
      conf.set('paths:defaultRouteSettings', '/default/route/settings');
      conf.set('adapters', {
        'route-settings': {
          active: 'S3RouteSettingsStore',
          FileStore: {},
          S3RouteSettingsStore: {
            bucket: 'a-bucket',
            staticFileURLPrefix: 'content/settings',
          },
        },
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.deepEqual(normalizedConfig['route-settings'], {
        active: 'S3RouteSettingsStore',
        FileStore: {
          basePath: conf.getContentPath('settings'),
          defaultSettingsBasePath: '/default/route/settings',
        },
        S3RouteSettingsStore: {
          bucket: 'a-bucket',
          staticFileURLPrefix: 'content/settings',
          defaultSettingsBasePath: '/default/route/settings',
        },
      });
    });

    it('keeps an explicitly configured S3RouteSettingsStore default settings path', () => {
      const conf = loadNconf();
      conf.set('paths:defaultRouteSettings', '/default/route/settings');
      conf.set('adapters', {
        'route-settings': {
          active: 'S3RouteSettingsStore',
          S3RouteSettingsStore: {
            bucket: 'a-bucket',
            staticFileURLPrefix: 'content/settings',
            defaultSettingsBasePath: '/custom/defaults',
          },
        },
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.equal(
        storeOptions(normalizedConfig, 'route-settings', 'S3RouteSettingsStore')
          ?.defaultSettingsBasePath,
        '/custom/defaults',
      );
    });

    // Pins the `||=` semantics the helper has always had: nconf turns an env
    // override like `..._defaultSettingsBasePath=` into an empty string, and a
    // usable default beats handing the store an empty path.
    it('treats an empty configured path as unset and falls back to the default', () => {
      const conf = loadNconf();
      conf.set('paths:defaultRouteSettings', '/default/route/settings');
      conf.set('adapters', {
        'route-settings': {
          active: 'S3RouteSettingsStore',
          S3RouteSettingsStore: {
            bucket: 'a-bucket',
            staticFileURLPrefix: 'content/settings',
            defaultSettingsBasePath: '',
          },
        },
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.equal(
        storeOptions(normalizedConfig, 'route-settings', 'S3RouteSettingsStore')
          ?.defaultSettingsBasePath,
        '/default/route/settings',
      );
    });

    it('does not invent adapter config for a store that is not configured', () => {
      const conf = loadNconf();
      conf.set('paths:defaultRouteSettings', '/default/route/settings');
      conf.set('adapters', {
        'route-settings': {
          active: 'FileStore',
          FileStore: {},
        },
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.equal(
        storeOptions(normalizedConfig, 'route-settings', 'S3RouteSettingsStore'),
        undefined,
      );
    });

    // Redirects resolves a path for FileStore only, so this pins the other
    // half of the same rule: a store with no defaults to fill is left alone
    // even when a sibling store in the same block is being filled in.
    it('fills the redirects FileStore path without touching the S3 store config', () => {
      const conf = loadNconf();
      conf.set('adapters', {
        redirects: {
          active: 'S3RedirectsStore',
          FileStore: {},
          S3RedirectsStore: {
            bucket: 'a-bucket',
            staticFileURLPrefix: 'content/data',
          },
        },
      });
      const normalizedConfig = normalizeAdapterConfig(conf);
      assert.deepEqual(normalizedConfig.redirects, {
        active: 'S3RedirectsStore',
        FileStore: {
          basePath: conf.getContentPath('data'),
        },
        S3RedirectsStore: {
          bucket: 'a-bucket',
          staticFileURLPrefix: 'content/data',
        },
      });
    });

    it('re-resolves route-settings paths when the content path changes', () => {
      // config.get('adapters') hands back a live reference, so resolving
      // the paths in place would bake the first caller's content path in
      const conf = loadNconf();
      conf.set('adapters', {
        'route-settings': {
          active: 'FileStore',
          FileStore: {},
        },
      });

      const before = normalizeAdapterConfig(conf);
      conf.set('paths:contentPath', '/elsewhere/');
      const after = normalizeAdapterConfig(conf);

      const afterPath = storeOptions(after, 'route-settings', 'FileStore')?.basePath;
      assert.equal(afterPath, conf.getContentPath('settings'));
      assert.notEqual(afterPath, storeOptions(before, 'route-settings', 'FileStore')?.basePath);
    });
  });
});
