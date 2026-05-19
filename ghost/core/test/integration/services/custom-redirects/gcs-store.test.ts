/* eslint-disable ghost/mocha/no-setup-in-describe -- runStoreContract is the parameterised-test seam; calling it inside describe is the intended use. */
import assert from 'node:assert/strict';
import {ListObjectsV2Command, S3Client} from '@aws-sdk/client-s3';

import {GCSStore} from '../../../../core/server/services/custom-redirects/gcs-store';
import {
    createTestS3Client,
    createTestBucket,
    emptyTestBucket,
    deleteTestBucket,
    getObject,
    putObject
} from '../../../utils/minio';
import {runStoreContract} from '../../../unit/server/services/custom-redirects/helpers/store-contract';

const listObjectKeys = async (s3Client: S3Client, bucketName: string): Promise<string[]> => {
    const response = await s3Client.send(new ListObjectsV2Command({Bucket: bucketName}));
    return (response.Contents ?? []).map(o => o.Key ?? '').filter(Boolean);
};

describe('Integration: GCSStore', function () {
    let client: S3Client;
    let bucket: string;

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

    runStoreContract({
        createStore: () => new GCSStore({s3Client: client, bucket})
    });

    describe('getAll: error handling', function () {
        it('throws when redirects.json is corrupt', async function () {
            await putObject(client, bucket, 'redirects.json', '{not valid');

            const store = new GCSStore({s3Client: client, bucket});

            await assert.rejects(
                () => store.getAll(),
                {errorType: 'BadRequestError'}
            );
        });
    });

    describe('replaceAll: timestamped backups', function () {
        it('writes the canonical key without a backup when the bucket is empty', async function () {
            const store = new GCSStore({s3Client: client, bucket});

            await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

            assert.deepEqual(await listObjectKeys(client, bucket), ['redirects.json']);
        });

        it('backs up the prior contents before overwriting', async function () {
            // Inject a stable backup key — the default per-second
            // timestamp would otherwise make this test depend on
            // wall-clock granularity.
            const backupKey = 'redirects-backup.json';
            const store = new GCSStore({
                s3Client: client,
                bucket,
                getBackupKey: () => backupKey
            });
            const initial = [{from: '/old', to: '/old-target', permanent: true}];

            await store.replaceAll(initial);
            await store.replaceAll([{from: '/new', to: '/new-target', permanent: false}]);

            const backupBody = await getObject(client, bucket, backupKey);
            assert.equal(backupBody?.toString('utf-8'), JSON.stringify(initial));
        });

        it('creates a new backup on every overwrite', async function () {
            // Counter-based generator gives each overwrite a distinct
            // backup key, so the test can assert accumulation without
            // depending on wall-clock granularity.
            let backupCounter = 0;
            const store = new GCSStore({
                s3Client: client,
                bucket,
                getBackupKey: () => {
                    backupCounter += 1;
                    return `redirects-backup-${backupCounter}.json`;
                }
            });

            await store.replaceAll([{from: '/a', to: '/a', permanent: true}]);
            await store.replaceAll([{from: '/b', to: '/b', permanent: true}]);
            await store.replaceAll([{from: '/c', to: '/c', permanent: true}]);

            const keys = (await listObjectKeys(client, bucket)).sort();
            assert.deepEqual(keys, [
                'redirects-backup-1.json',
                'redirects-backup-2.json',
                'redirects.json'
            ]);
        });
    });
});
