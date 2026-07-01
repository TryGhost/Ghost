const assert = require('node:assert/strict');
const {
    createTestS3Client,
    createTestBucket,
    emptyTestBucket,
    deleteTestBucket,
    putObject,
    getObject,
    deleteObject
} = require('../../utils/minio');

// Skip when MinIO is unreachable. The flag is set by the integration
// globalSetup (vitest-globalsetup-services.ts), which probes MinIO once before
// the forks spawn.
describe.skipIf(process.env.GHOST_TEST_MINIO_AVAILABLE !== '1')('Integration: MinIO test helper', function () {
    let client;
    let bucket;

    beforeAll(async function () {
        client = createTestS3Client();
        bucket = await createTestBucket(client);
    });

    afterEach(async function () {
        await emptyTestBucket(client, bucket);
    });

    afterAll(async function () {
        await deleteTestBucket(client, bucket);
    });

    it('putObject + getObject round-trip preserves the body', async function () {
        const body = '{"hello":"world"}';
        await putObject(client, bucket, 'config.json', body);

        const fetched = await getObject(client, bucket, 'config.json');
        assert.equal(fetched?.toString('utf8'), body);
    });

    it('getObject returns null for a missing key', async function () {
        assert.equal(await getObject(client, bucket, 'does-not-exist'), null);
    });

    it('deleteObject removes the object', async function () {
        await putObject(client, bucket, 'k', 'v');
        await deleteObject(client, bucket, 'k');

        assert.equal(await getObject(client, bucket, 'k'), null);
    });

    it('emptyTestBucket removes every object', async function () {
        await putObject(client, bucket, 'a', 'a-body');
        await putObject(client, bucket, 'b', 'b-body');

        await emptyTestBucket(client, bucket);

        assert.equal(await getObject(client, bucket, 'a'), null);
        assert.equal(await getObject(client, bucket, 'b'), null);
    });
});
