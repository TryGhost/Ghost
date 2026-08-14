import {describe, it, beforeAll, afterEach, afterAll} from 'vitest';
import assert from 'node:assert/strict';

import S3Storage from '../../../../core/server/adapters/storage/S3Storage';
import {
    createTestS3Client,
    createTestBucket,
    emptyTestBucket,
    deleteTestBucket,
    getMinioConfig,
    putObject
} from '../../../utils/minio';

const STATIC_PREFIX = 'content/images';
const minioConfig = getMinioConfig();

// read() builds the object key as [tenantPrefix/]storagePath/relativePath, so a
// test fixture must be written at that exact key for read() to find it.
const objectKey = (relativePath: string, tenantPrefix = '') => [tenantPrefix, STATIC_PREFIX, relativePath].filter(Boolean).join('/');

// Skip when MinIO is unreachable. The flag is set by the integration
// globalSetup (vitest-globalsetup-services.ts), which probes MinIO once before
// the forks spawn. (PLA-170)
describe.skipIf(process.env.GHOST_TEST_MINIO_AVAILABLE !== '1')('Integration: S3Storage.read', function () {
    let adminClient: ReturnType<typeof createTestS3Client>;
    let bucket: string;

    const createStorage = (overrides = {}) => new S3Storage({
        ...minioConfig,
        bucket,
        cdnUrl: `${minioConfig.endpoint}/${bucket}`,
        staticFileURLPrefix: STATIC_PREFIX,
        multipartUploadThresholdBytes: 10 * 1024 * 1024,
        multipartChunkSizeBytes: 10 * 1024 * 1024,
        ...overrides
    });

    beforeAll(async function () {
        adminClient = createTestS3Client();
        bucket = await createTestBucket(adminClient, 'test-storage');
    });

    afterEach(async function () {
        await emptyTestBucket(adminClient, bucket);
    });

    afterAll(async function () {
        await deleteTestBucket(adminClient, bucket);
    });

    it('reads back the raw bytes of an object written to storage', async function () {
        // Include NUL and high bytes to prove read() is binary-safe (images).
        const body = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x0a, 0x01]);
        await putObject(adminClient, bucket, objectKey('2024/06/image.jpg'), body);

        const result = await createStorage().read({path: '2024/06/image.jpg'});

        assert.deepEqual(result, body);
    });

    it('round-trips a file referenced by its absolute storage path', async function () {
        // image dimension lookups pass the local-style /content/images/ path;
        // read() must map that back to the same key save() would have written.
        const body = Buffer.from('saved-via-adapter');
        await putObject(adminClient, bucket, objectKey('2024/06/saved.png'), body);

        const result = await createStorage().read({path: '/content/images/2024/06/saved.png'});

        assert.deepEqual(result, body);
    });

    it('throws NotFoundError when the object is missing', async function () {
        await assert.rejects(
            () => createStorage().read({path: '2024/06/missing.jpg'}),
            (err: Error) => {
                assert.equal((err as {errorType?: string}).errorType, 'NotFoundError');
                assert.match(err.message, /Could not read file: 2024\/06\/missing\.jpg/);
                return true;
            }
        );
    });

    it('throws IncorrectUsageError when no path is given', async function () {
        await assert.rejects(
            () => createStorage().read(),
            {errorType: 'IncorrectUsageError', message: /requires a non-empty path/}
        );
    });

    describe('tenantPrefix scoping', function () {
        const TENANT = 'tenant-abc';

        it('reads an object stored under the tenant prefix', async function () {
            const body = Buffer.from('tenant-scoped-bytes');
            await putObject(adminClient, bucket, objectKey('2024/06/image.jpg', TENANT), body);

            const result = await createStorage({tenantPrefix: TENANT}).read({path: '2024/06/image.jpg'});

            assert.deepEqual(result, body);
        });

        it('does not read another tenant\'s object', async function () {
            await putObject(adminClient, bucket, objectKey('2024/06/image.jpg', 'tenant-other'), Buffer.from('other'));

            await assert.rejects(
                () => createStorage({tenantPrefix: TENANT}).read({path: '2024/06/image.jpg'}),
                {errorType: 'NotFoundError'}
            );
        });
    });
});
