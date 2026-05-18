import {randomBytes} from 'node:crypto';
import {
    CreateBucketCommand,
    DeleteBucketCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    NoSuchKey,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';

const DEFAULT_TEST_BUCKET_PREFIX = 'test-redirects';

export function createTestS3Client(): S3Client {
    return new S3Client({
        endpoint: process.env.MINIO_TEST_ENDPOINT || 'http://127.0.0.1:9000',
        region: process.env.MINIO_TEST_REGION || 'us-east-1',
        // MinIO serves buckets via URL path (http://host/bucket/key) rather than
        // AWS's virtual-host style (https://bucket.s3.amazonaws.com/key).
        forcePathStyle: true,
        credentials: {
            accessKeyId: process.env.MINIO_TEST_ACCESS_KEY || 'minio-user',
            secretAccessKey: process.env.MINIO_TEST_SECRET_KEY || 'minio-pass'
        }
    });
}

export async function createTestBucket(
    client: S3Client,
    prefix: string = DEFAULT_TEST_BUCKET_PREFIX
): Promise<string> {
    const bucket = `${prefix}-${randomBytes(4).toString('hex')}`;
    await client.send(new CreateBucketCommand({Bucket: bucket}));
    return bucket;
}

export async function emptyTestBucket(client: S3Client, bucket: string): Promise<void> {
    let continuationToken: string | undefined;
    do {
        const response = await client.send(new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken
        }));
        for (const object of response.Contents ?? []) {
            if (object.Key) {
                await client.send(new DeleteObjectCommand({Bucket: bucket, Key: object.Key}));
            }
        }
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
}

export async function deleteTestBucket(client: S3Client, bucket: string): Promise<void> {
    await client.send(new DeleteBucketCommand({Bucket: bucket}));
}

export async function putObject(
    client: S3Client,
    bucket: string,
    key: string,
    body: string | Buffer
): Promise<void> {
    await client.send(new PutObjectCommand({Bucket: bucket, Key: key, Body: body}));
}

/**
 * Returns null when the key is missing instead of throwing. Matches the
 * planned GCSStore.getAll() behaviour from HKG-1700 ("Returns [] on 404")
 * so tests asserting absence don't need try/catch wrappers.
 */
export async function getObject(
    client: S3Client,
    bucket: string,
    key: string
): Promise<Buffer | null> {
    try {
        const response = await client.send(new GetObjectCommand({Bucket: bucket, Key: key}));
        if (!response.Body) {
            return null;
        }
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
    } catch (err) {
        if (err instanceof NoSuchKey) {
            return null;
        }
        throw err;
    }
}

export async function deleteObject(
    client: S3Client,
    bucket: string,
    key: string
): Promise<void> {
    await client.send(new DeleteObjectCommand({Bucket: bucket, Key: key}));
}
