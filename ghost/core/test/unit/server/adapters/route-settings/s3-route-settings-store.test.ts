import assert from 'node:assert/strict';

import {RouteSettingsStoreBase} from '@tryghost/adapter-base-route-settings';

import S3RouteSettingsStore from '../../../../../core/server/adapters/route-settings/S3RouteSettingsStore';

const validConfig = {
    bucket: 'a-bucket',
    staticFileURLPrefix: 'content/settings',
    defaultSettingsBasePath: '/var/lib/ghost/content/settings'
};

describe('UNIT: S3RouteSettingsStore', function () {
    describe('adapter contract', function () {
        it('extends RouteSettingsStoreBase and declares get/replace as required', function () {
            const store = new S3RouteSettingsStore(validConfig);

            assert.ok(store instanceof RouteSettingsStoreBase);
            assert.deepEqual([...store.requiredFns], ['get', 'replace']);
        });
    });

    describe('constructor validation', function () {
        it('throws when no bucket is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({staticFileURLPrefix: 'content/settings', defaultSettingsBasePath: '/x'} as never),
                {errorType: 'IncorrectUsageError', message: /bucket/}
            );
        });

        it('throws when no staticFileURLPrefix is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({bucket: 'x', defaultSettingsBasePath: '/x'} as never),
                {errorType: 'IncorrectUsageError', message: /staticFileURLPrefix/}
            );
        });

        it('throws when no defaultSettingsBasePath is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({bucket: 'x', staticFileURLPrefix: 'content/settings'} as never),
                {errorType: 'IncorrectUsageError', message: /defaultSettingsBasePath/}
            );
        });

        it('throws when only accessKeyId is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({...validConfig, accessKeyId: 'AKIA'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when only secretAccessKey is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({...validConfig, secretAccessKey: 'shh'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when sessionToken is provided without the credential pair', function () {
            assert.throws(
                () => new S3RouteSettingsStore({...validConfig, sessionToken: 'session'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('accepts a tenantPrefix without throwing', function () {
            assert.doesNotThrow(() => new S3RouteSettingsStore({...validConfig, tenantPrefix: 'tenant-abc'}));
        });

        it('accepts a complete credential pair without throwing', function () {
            assert.doesNotThrow(() => new S3RouteSettingsStore({...validConfig, accessKeyId: 'AKIA', secretAccessKey: 'shh'}));
        });
    });
});
