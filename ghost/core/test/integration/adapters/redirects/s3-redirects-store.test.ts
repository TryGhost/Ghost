/* eslint-disable ghost/mocha/no-top-level-hooks -- false positive: the hooks are inside the describe, but the lint plugin can't see through the describe.skipIf()() gate below. (PLA-170) */
import {describe, it, beforeAll, afterEach, afterAll} from 'vitest';
import assert from 'node:assert/strict';
import {ListObjectsV2Command, S3Client} from '@aws-sdk/client-s3';

import S3RedirectsStore from '../../../../core/server/adapters/redirects/S3RedirectsStore';
import {
    createTestS3Client,
    createTestBucket,
    emptyTestBucket,
    deleteTestBucket,
    getMinioConfig,
    getObject,
    putObject
} from '../../../utils/minio';
import {runStoreContract} from '../../../unit/server/services/custom-redirects/helpers/store-contract';

const STATIC_PREFIX = 'content/data';
const CANONICAL_FILENAME = 'redirects.json';

const canonicalKey = (tenantPrefix = '') => [tenantPrefix, STATIC_PREFIX, CANONICAL_FILENAME].filter(Boolean).join('/');

const listObjectKeys = async (s3Client: S3Client, bucketName: string): Promise<string[]> => {
    const response = await s3Client.send(new ListObjectsV2Command({Bucket: bucketName}));
    return (response.Contents ?? []).map(o => o.Key ?? '').filter(Boolean);
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const backupKeyPattern = (tenantPrefix = '') => new RegExp(
    `^${tenantPrefix ? `${tenantPrefix}/` : ''}${STATIC_PREFIX}/redirects-\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2}\\.json$`
);

// Skip when MinIO is unreachable. The flag is set by the integration
// globalSetup (vitest-globalsetup-services.ts), which probes MinIO once before
// the forks spawn. (PLA-170)
describe.skipIf(process.env.GHOST_TEST_MINIO_AVAILABLE !== '1')('Integration: S3RedirectsStore', function () {
    let adminClient: S3Client;
    let bucket: string;
    const minioConfig = getMinioConfig();

    beforeAll(async function () {
        adminClient = createTestS3Client();
        bucket = await createTestBucket(adminClient);
    });

    afterEach(async function () {
        await emptyTestBucket(adminClient, bucket);
    });

    afterAll(async function () {
        await deleteTestBucket(adminClient, bucket);
    });

    runStoreContract({
        createStore: () => new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX})
    });

    describe('getAll: error handling', function () {
        it('throws when redirects.json is corrupt', async function () {
            await putObject(adminClient, bucket, canonicalKey(), '{not valid');

            const store = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX});

            await assert.rejects(
                () => store.getAll(),
                {errorType: 'BadRequestError'}
            );
        });
    });

    describe('replaceAll: timestamped backups', function () {
        it('writes the canonical key without a backup when the bucket is empty', async function () {
            const store = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX});

            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            assert.deepEqual(await listObjectKeys(adminClient, bucket), [canonicalKey()]);
        });

        it('backs up the prior contents before overwriting', async function () {
            const store = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX});
            const initial = [{from: '/old', to: '/old-target', permanent: true}];

            await store.replaceAll(initial);
            await store.replaceAll([{from: '/new', to: '/new-target', permanent: false}]);

            const keys = await listObjectKeys(adminClient, bucket);
            const backupKey = keys.find(k => backupKeyPattern().test(k));
            assert.ok(backupKey, `expected a timestamped backup key, got: ${keys.join(', ')}`);

            const backupBody = await getObject(adminClient, bucket, backupKey!);
            assert.equal(backupBody?.toString('utf-8'), JSON.stringify(initial));
        });

        it('creates a new backup on every overwrite', {timeout: 15000}, async function () {
            // The backup key generator uses a per-second timestamp, so
            // real waits between writes are needed to guarantee distinct
            // backup keys.
            const store = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX});

            await store.replaceAll([{from: '/a', to: '/a', permanent: true}]);
            await sleep(1100);
            await store.replaceAll([{from: '/b', to: '/b', permanent: true}]);
            await sleep(1100);
            await store.replaceAll([{from: '/c', to: '/c', permanent: true}]);

            const keys = await listObjectKeys(adminClient, bucket);
            const backupKeys = keys.filter(k => backupKeyPattern().test(k));
            assert.equal(backupKeys.length, 2, `expected 2 timestamped backups, got: ${keys.join(', ')}`);
            assert.ok(keys.includes(canonicalKey()), `expected canonical ${canonicalKey()}, got: ${keys.join(', ')}`);
        });
    });

    describe('tenantPrefix scoping', function () {
        it('writes the canonical key under the tenant prefix', async function () {
            const store = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX, tenantPrefix: 'tenant-abc'});

            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            assert.deepEqual(
                await listObjectKeys(adminClient, bucket),
                [canonicalKey('tenant-abc')]
            );
        });

        it('reads back redirects from the prefixed key', async function () {
            const store = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX, tenantPrefix: 'tenant-abc'});
            const redirects = [{from: '/old', to: '/new', permanent: true}];

            await store.replaceAll(redirects);

            assert.deepEqual(await store.getAll(), redirects);
        });

        it('writes backups under the tenant prefix on overwrite', async function () {
            const store = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX, tenantPrefix: 'tenant-abc'});
            const initial = [{from: '/old', to: '/old-target', permanent: true}];

            await store.replaceAll(initial);
            await store.replaceAll([{from: '/new', to: '/new-target', permanent: false}]);

            const keys = await listObjectKeys(adminClient, bucket);
            const backupKey = keys.find(k => backupKeyPattern('tenant-abc').test(k));
            assert.ok(backupKey, `expected a tenant-scoped backup key, got: ${keys.join(', ')}`);

            const backupBody = await getObject(adminClient, bucket, backupKey!);
            assert.equal(backupBody?.toString('utf-8'), JSON.stringify(initial));
        });

        it('isolates tenants sharing the same bucket', async function () {
            const storeA = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX, tenantPrefix: 'tenant-a'});
            const storeB = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX, tenantPrefix: 'tenant-b'});

            await storeA.replaceAll([{from: '/a', to: '/a-target', permanent: true}]);
            await storeB.replaceAll([{from: '/b', to: '/b-target', permanent: false}]);

            assert.deepEqual(await storeA.getAll(), [{from: '/a', to: '/a-target', permanent: true}]);
            assert.deepEqual(await storeB.getAll(), [{from: '/b', to: '/b-target', permanent: false}]);
            assert.deepEqual(
                (await listObjectKeys(adminClient, bucket)).sort(),
                [canonicalKey('tenant-a'), canonicalKey('tenant-b')]
            );
        });

        it('strips leading and trailing slashes from the tenant prefix', async function () {
            const store = new S3RedirectsStore({...minioConfig, bucket, staticFileURLPrefix: STATIC_PREFIX, tenantPrefix: '/tenant-abc/'});

            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            assert.deepEqual(
                await listObjectKeys(adminClient, bucket),
                [canonicalKey('tenant-abc')]
            );
        });
    });
});
