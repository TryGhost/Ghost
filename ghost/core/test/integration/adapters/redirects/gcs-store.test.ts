/* eslint-disable ghost/mocha/no-setup-in-describe -- runStoreContract is the parameterised-test seam; calling it inside describe is the intended use. */
import assert from 'node:assert/strict';
import {ListObjectsV2Command, S3Client} from '@aws-sdk/client-s3';

import GCSStore from '../../../../core/server/adapters/redirects/GCSStore';
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

const listObjectKeys = async (s3Client: S3Client, bucketName: string): Promise<string[]> => {
    const response = await s3Client.send(new ListObjectsV2Command({Bucket: bucketName}));
    return (response.Contents ?? []).map(o => o.Key ?? '').filter(Boolean);
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const backupKeyPattern = (prefix = '') => new RegExp(
    `^${prefix ? `${prefix}/` : ''}redirects-\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2}\\.json$`
);

describe('Integration: GCSStore', function () {
    let adminClient: S3Client;
    let bucket: string;
    const minioConfig = getMinioConfig();

    before(async function () {
        adminClient = createTestS3Client();
        bucket = await createTestBucket(adminClient);
    });

    afterEach(async function () {
        await emptyTestBucket(adminClient, bucket);
    });

    after(async function () {
        await deleteTestBucket(adminClient, bucket);
    });

    runStoreContract({
        createStore: () => new GCSStore({...minioConfig, bucket})
    });

    describe('getAll: error handling', function () {
        it('throws when redirects.json is corrupt', async function () {
            await putObject(adminClient, bucket, 'redirects.json', '{not valid');

            const store = new GCSStore({...minioConfig, bucket});

            await assert.rejects(
                () => store.getAll(),
                {errorType: 'BadRequestError'}
            );
        });
    });

    describe('replaceAll: timestamped backups', function () {
        it('writes the canonical key without a backup when the bucket is empty', async function () {
            const store = new GCSStore({...minioConfig, bucket});

            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            assert.deepEqual(await listObjectKeys(adminClient, bucket), ['redirects.json']);
        });

        it('backs up the prior contents before overwriting', async function () {
            const store = new GCSStore({...minioConfig, bucket});
            const initial = [{from: '/old', to: '/old-target', permanent: true}];

            await store.replaceAll(initial);
            await store.replaceAll([{from: '/new', to: '/new-target', permanent: false}]);

            const keys = await listObjectKeys(adminClient, bucket);
            const backupKey = keys.find(k => backupKeyPattern().test(k));
            assert.ok(backupKey, `expected a timestamped backup key, got: ${keys.join(', ')}`);

            const backupBody = await getObject(adminClient, bucket, backupKey!);
            assert.equal(backupBody?.toString('utf-8'), JSON.stringify(initial));
        });

        it('creates a new backup on every overwrite', async function () {
            // The backup key generator uses a per-second timestamp, so
            // real waits between writes are needed to guarantee distinct
            // backup keys.
            this.timeout(15000);
            const store = new GCSStore({...minioConfig, bucket});

            await store.replaceAll([{from: '/a', to: '/a', permanent: true}]);
            await sleep(1100);
            await store.replaceAll([{from: '/b', to: '/b', permanent: true}]);
            await sleep(1100);
            await store.replaceAll([{from: '/c', to: '/c', permanent: true}]);

            const keys = await listObjectKeys(adminClient, bucket);
            const backupKeys = keys.filter(k => backupKeyPattern().test(k));
            assert.equal(backupKeys.length, 2, `expected 2 timestamped backups, got: ${keys.join(', ')}`);
            assert.ok(keys.includes('redirects.json'), `expected canonical redirects.json, got: ${keys.join(', ')}`);
        });
    });

    describe('tenantPrefix scoping', function () {
        it('writes the canonical key under the tenant prefix', async function () {
            const store = new GCSStore({...minioConfig, bucket, tenantPrefix: 'tenant-abc'});

            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            assert.deepEqual(
                await listObjectKeys(adminClient, bucket),
                ['tenant-abc/redirects.json']
            );
        });

        it('reads back redirects from the prefixed key', async function () {
            const store = new GCSStore({...minioConfig, bucket, tenantPrefix: 'tenant-abc'});
            const redirects = [{from: '/old', to: '/new', permanent: true}];

            await store.replaceAll(redirects);

            assert.deepEqual(await store.getAll(), redirects);
        });

        it('writes backups under the tenant prefix on overwrite', async function () {
            const store = new GCSStore({...minioConfig, bucket, tenantPrefix: 'tenant-abc'});
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
            const storeA = new GCSStore({...minioConfig, bucket, tenantPrefix: 'tenant-a'});
            const storeB = new GCSStore({...minioConfig, bucket, tenantPrefix: 'tenant-b'});

            await storeA.replaceAll([{from: '/a', to: '/a-target', permanent: true}]);
            await storeB.replaceAll([{from: '/b', to: '/b-target', permanent: false}]);

            assert.deepEqual(await storeA.getAll(), [{from: '/a', to: '/a-target', permanent: true}]);
            assert.deepEqual(await storeB.getAll(), [{from: '/b', to: '/b-target', permanent: false}]);
            assert.deepEqual(
                (await listObjectKeys(adminClient, bucket)).sort(),
                ['tenant-a/redirects.json', 'tenant-b/redirects.json']
            );
        });

        it('strips leading and trailing slashes from the tenant prefix', async function () {
            const store = new GCSStore({...minioConfig, bucket, tenantPrefix: '/tenant-abc/'});

            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            assert.deepEqual(
                await listObjectKeys(adminClient, bucket),
                ['tenant-abc/redirects.json']
            );
        });
    });
});
