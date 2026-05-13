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

describe('Integration: MinIO test helper', function () {
    let client;
    let bucket;

    before(async function () {
        client = createTestS3Client();
        bucket = await createTestBucket(client);
    });

    afterEach(async function () {
        await emptyTestBucket(client, bucket);
    });

    after(async function () {
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
