import {describe, it, beforeAll, afterEach, afterAll} from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import S3Storage from '../../../../core/server/adapters/storage/S3Storage';
import {
    createTestS3Client,
    createTestBucket,
    emptyTestBucket,
    deleteTestBucket,
    getMinioConfig,
    putObject
} from '../../../utils/minio';

// CJS Ghost libs — required (not imported) to preserve `this` binding on the
// storageUtils namespace (isLocalImage calls this.getLocalImagesStoragePath).
const ImageSize = require('../../../../core/server/lib/image/image-size');
const storageUtils = require('../../../../core/server/adapters/storage/utils');
const urlUtils = require('../../../../core/shared/url-utils');
const config = require('../../../../core/shared/config');
const validator = require('@tryghost/validator');
const request = require('@tryghost/request');
const {probe} = require('../../../../core/server/lib/image/image-utils');

const STATIC_PREFIX = 'content/images';
const minioConfig = getMinioConfig();

// 100x100 png fixture — the same one Ghost ships for favicon tests.
const FIXTURE = fs.readFileSync(path.join(process.cwd(), 'test/utils/fixtures/images/favicon.png'));
const FIXTURE_WIDTH = 100;
const FIXTURE_HEIGHT = 100;

// This is the INC-300 flow: a meta image (cover/og/twitter) that resolves to a
// site-relative /content/images/... URL is classified "local", so the dimension
// lookup reads it from the images storage adapter. With S3 configured as that
// adapter, S3Storage.read() must return the bytes so dimensions resolve instead
// of throwing.
describe.skipIf(process.env.GHOST_TEST_MINIO_AVAILABLE !== '1')('Integration: image dimensions via S3 storage', function () {
    let adminClient: ReturnType<typeof createTestS3Client>;
    let bucket: string;

    const createImageSize = (overrides = {}) => {
        const s3 = new S3Storage({
            ...minioConfig,
            bucket,
            cdnUrl: `${minioConfig.endpoint}/${bucket}`,
            staticFileURLPrefix: STATIC_PREFIX,
            multipartUploadThresholdBytes: 10 * 1024 * 1024,
            multipartChunkSizeBytes: 10 * 1024 * 1024,
            ...overrides
        });
        // ImageSize asks the storage manager for the 'images' adapter.
        return new ImageSize({config, imageStore: s3, storageUtils, validator, urlUtils, request, probe});
    };

    beforeAll(async function () {
        adminClient = createTestS3Client();
        bucket = await createTestBucket(adminClient, 'test-imagesize');
    });

    afterEach(async function () {
        await emptyTestBucket(adminClient, bucket);
    });

    afterAll(async function () {
        await deleteTestBucket(adminClient, bucket);
    });

    it('resolves dimensions for a relative /content/images URL backed by S3', async function () {
        await putObject(adminClient, bucket, 'content/images/2024/06/cover.png', FIXTURE);

        const result = await createImageSize().getImageSizeFromUrl('/content/images/2024/06/cover.png');

        assert.equal(result.width, FIXTURE_WIDTH);
        assert.equal(result.height, FIXTURE_HEIGHT);
    });

    it('resolves dimensions for an absolute site /content/images URL backed by S3', async function () {
        await putObject(adminClient, bucket, 'content/images/2024/06/cover.png', FIXTURE);

        const siteUrl = urlUtils.urlFor('home', true).replace(/\/$/, '');
        const result = await createImageSize().getImageSizeFromUrl(`${siteUrl}/content/images/2024/06/cover.png`);

        assert.equal(result.width, FIXTURE_WIDTH);
        assert.equal(result.height, FIXTURE_HEIGHT);
    });

    it('resolves dimensions when the adapter uses a tenant prefix', async function () {
        await putObject(adminClient, bucket, 'tenant-x/content/images/2024/06/cover.png', FIXTURE);

        const result = await createImageSize({tenantPrefix: 'tenant-x'})
            .getImageSizeFromUrl('/content/images/2024/06/cover.png');

        assert.equal(result.width, FIXTURE_WIDTH);
        assert.equal(result.height, FIXTURE_HEIGHT);
    });

    it('rejects with NotFoundError when the object is missing in S3', async function () {
        await assert.rejects(
            () => createImageSize().getImageSizeFromUrl('/content/images/2024/06/missing.png'),
            (err: Error) => {
                assert.equal((err as {errorType?: string}).errorType, 'NotFoundError');
                return true;
            }
        );
    });
});
