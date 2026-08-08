import {describe, it, beforeAll, afterEach, afterAll} from 'vitest';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import {CopyObjectCommand, ListObjectsV2Command, S3Client} from '@aws-sdk/client-s3';

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

interface StoreErrorShape {
    message?: string;
    code?: string;
    context?: string;
    help?: string;
    errorDetails?: {operation?: string; key?: string; requestId?: string};
}

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
// the forks spawn.
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

// The S3 fault branches are exercised without a live bucket: MinIO won't
// produce a dead connection or an AccessDenied on demand, so the failures are
// driven with an injected client. This lives in the integration suite because
// only that coverage report is uploaded, and it runs regardless of MinIO. The
// cases here are chosen not to overlap the route-settings integration suite —
// between the two, every branch of `adapters/lib/s3/errors` is covered.
describe('Integration: S3RedirectsStore S3 failures', function () {
    const faultyStore = (send: (command: unknown) => Promise<unknown>) => {
        const client: Pick<S3Client, 'send'> = {send: sinon.stub().callsFake(send)};
        return new S3RedirectsStore({
            bucket: 'a-bucket',
            staticFileURLPrefix: STATIC_PREFIX,
            s3Client: client as S3Client
        });
    };

    // The request never reaches S3, so there is no service error code to
    // report — only the errno tells the operator what happened.
    it('reports the errno when the storage service cannot be reached', async function () {
        const store = faultyStore(async () => {
            throw Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:443'), {code: 'ECONNREFUSED'});
        });

        await assert.rejects(store.getAll(), (err: StoreErrorShape) => {
            assert.equal(err.message, 'Could not read redirects.json from storage: ECONNREFUSED (GetObject).');
            assert.equal(err.code, 'REDIRECTS_STORAGE_REQUEST_FAILED');
            assert.match(String(err.help), /could not reach the storage service/);
            assert.equal(err.errorDetails?.key, canonicalKey());
            return true;
        });
    });

    // The body is streamed after the request that opened it succeeds, so a
    // reset partway through rejects separately — and with nothing on it to
    // identify the failure by.
    it('reports a body-stream failure against GetObject', async function () {
        const store = faultyStore(async () => ({
            Body: {
                transformToString: async () => {
                    throw new Error('aborted');
                }
            }
        }));

        await assert.rejects(store.getAll(), (err: StoreErrorShape) => {
            assert.equal(err.message, 'Could not read redirects.json from storage: UnknownError (GetObject).');
            assert.equal(err.code, 'REDIRECTS_STORAGE_REQUEST_FAILED');
            assert.equal(err.context, 'aborted');
            assert.equal(err.help, undefined);
            return true;
        });
    });

    it('reports the write operation and the backup key when the backup fails', async function () {
        const store = faultyStore(async (command) => {
            if (command instanceof CopyObjectCommand) {
                throw Object.assign(new Error('Please reduce your request rate.'), {
                    name: 'SlowDown',
                    $metadata: {httpStatusCode: 503, requestId: 'REQ-1'}
                });
            }
            return {};
        });

        await assert.rejects(store.replaceAll([]), (err: StoreErrorShape) => {
            assert.equal(err.message, 'Could not save redirects.json to storage: SlowDown (CopyObject).');
            assert.match(String(err.errorDetails?.key), backupKeyPattern());
            assert.equal(err.errorDetails?.requestId, 'REQ-1');
            assert.match(String(err.help), /temporarily unavailable/);
            return true;
        });
    });
});
