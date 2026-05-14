/* eslint-disable ghost/mocha/no-setup-in-describe -- runStoreContract is the parameterised-test seam; calling it inside describe is the intended use. */
import {S3Client} from '@aws-sdk/client-s3';

import {GCSStore} from '../../../../core/server/services/custom-redirects/gcs-store';
import {
    createTestS3Client,
    createTestBucket,
    emptyTestBucket,
    deleteTestBucket
} from '../../../utils/minio';
import {runStoreContract} from '../../../unit/server/services/custom-redirects/helpers/store-contract';

describe('Integration: GCSStore (validates the contract)', function () {
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
});
