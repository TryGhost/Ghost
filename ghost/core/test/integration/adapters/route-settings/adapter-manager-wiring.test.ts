import {describe, it, beforeAll, afterEach, afterAll} from 'vitest';
import assert from 'node:assert/strict';
import {S3Client} from '@aws-sdk/client-s3';
import {Provider} from 'nconf';
import type {RouteSettings} from '@tryghost/adapter-base-route-settings';
import {bindAll as bindUrlHelpers} from '@tryghost/config-url-helpers';

import {normalizeAdapterConfig} from '../../../../core/server/services/adapter-manager/utils';
import {bindAll as bindHelpers} from '../../../../core/shared/config/helpers';
import type {ConfigInstance} from '../../../../core/shared/config/loader';

import {
    createTestS3Client,
    createTestBucket,
    emptyTestBucket,
    deleteTestBucket,
    getMinioConfig,
    getObject
} from '../../../utils/minio';

// config-utils is untyped JS, so it can't be imported; the adapter-manager is
// required alongside it for its `.default` export.
const adapterManager = require('../../../../core/server/services/adapter-manager').default;
const configUtils = require('../../../utils/config-utils');

const STATIC_PREFIX = 'content/settings';
const CANONICAL_KEY = `${STATIC_PREFIX}/routes.yaml`;

const SAMPLE_YAML = `# Custom routing for the site
routes:
  /about/: about

collections:
  /:
    permalink: /{slug}/
    template: index

taxonomies:
  tag: /tag/{slug}/
  author: /author/{slug}/
`;

// Skip when MinIO is unreachable. The flag is set by the integration
// globalSetup (vitest-globalsetup-services.ts), which probes MinIO once before
// the forks spawn.
describe.skipIf(process.env.GHOST_TEST_MINIO_AVAILABLE !== '1')('Integration: route-settings adapter-manager wiring', function () {
    let adminClient: S3Client;
    let bucket: string;

    beforeAll(async function () {
        adminClient = createTestS3Client();
        bucket = await createTestBucket(adminClient);
    });

    afterEach(async function () {
        await emptyTestBucket(adminClient, bucket);
        await configUtils.restore();
        adapterManager.clearCache();
    });

    afterAll(async function () {
        await deleteTestBucket(adminClient, bucket);
        adminClient.destroy();
    });

    // Only the S3 options an operator would actually set: `defaultSettingsBasePath`
    // is deliberately left out, so these tests fail if the adapter-manager stops
    // resolving it from `paths.defaultRouteSettings`.
    const activateS3Store = () => {
        configUtils.set('adapters:route-settings:active', 'S3RouteSettingsStore');
        configUtils.set('adapters:route-settings:S3RouteSettingsStore', {
            ...getMinioConfig(),
            bucket,
            staticFileURLPrefix: STATIC_PREFIX
        });
        adapterManager.clearCache();
    };

    it('serves the bundled defaults through the S3 store before anything is written', async function () {
        activateS3Store();

        const settings: RouteSettings = await adapterManager.getAdapter('route-settings').get();

        assert.deepEqual(settings.routes, []);
        assert.deepEqual(settings.collections, [{path: '/', permalink: '/{slug}/', templates: ['index']}]);
    });

    it('round-trips route settings through the bucket', async function () {
        activateS3Store();
        const store = adapterManager.getAdapter('route-settings');

        await store.replace({...await store.get(), yamlSource: SAMPLE_YAML});

        // Byte-level assertions (content type, backups) belong to the store's own
        // suite; here we only need proof the wired-up adapter reached the bucket.
        const written = await getObject(adminClient, bucket, CANONICAL_KEY);
        assert.equal(written?.toString('utf8'), SAMPLE_YAML);

        // A fresh instance re-reads from the bucket rather than any in-process state.
        adapterManager.clearCache();
        const reloaded: RouteSettings = await adapterManager.getAdapter('route-settings').get();
        assert.equal(reloaded.yamlSource, SAMPLE_YAML);
        assert.deepEqual(reloaded.routes, [{path: '/about/', templates: ['about'], type: 'template'}]);
    });
});

// A booted Ghost always has both adapter types configured, so the guards that
// skip an unconfigured type — or an unconfigured store within one — never run
// in an end-to-end suite. They need no bucket, so they run regardless of MinIO.
describe('Integration: route-settings adapter config normalization', function () {
    const loadNconf = (): ConfigInstance => {
        const nconf = new Provider();
        nconf.use('memory');
        nconf.set('paths:contentPath', '/some/path');
        nconf.set('paths:defaultRouteSettings', '/default/route/settings');

        bindUrlHelpers(nconf);
        bindHelpers(nconf);

        return nconf as unknown as ConfigInstance;
    };

    it('leaves an adapter type with no configuration untouched', function () {
        const conf = loadNconf();
        conf.set('adapters', {});

        const normalized = normalizeAdapterConfig(conf);

        assert.equal(normalized['route-settings'], undefined);
        assert.equal(normalized.redirects, undefined);
    });

    it('fills the configured store without inventing config for an absent one', function () {
        const conf = loadNconf();
        conf.set('adapters', {
            'route-settings': {
                active: 'FileStore',
                FileStore: {}
            }
        });

        const normalized = normalizeAdapterConfig(conf);

        assert.equal(normalized['route-settings'].FileStore.defaultSettingsBasePath, '/default/route/settings');
        assert.equal('S3RouteSettingsStore' in normalized['route-settings'], false);
    });
});
