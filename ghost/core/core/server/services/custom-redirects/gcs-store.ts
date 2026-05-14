import {
    GetObjectCommand,
    NoSuchKey,
    PutObjectCommand,
    S3Client,
    S3ClientConfig
} from '@aws-sdk/client-s3';
import tpl from '@tryghost/tpl';
import * as errors from '@tryghost/errors';

import {parseJson} from './redirect-config-parser';
import type {RedirectConfig, RedirectsStore} from './types';

const DEFAULT_KEY = 'redirects.json';

const messages = {
    missingBucket: 'GCSStore requires a bucket name',
    partialCredentials: 'GCSStore requires both accessKeyId and secretAccessKey, or neither'
};

export interface GCSStoreOptions {
    bucket: string;
    key?: string;
    region?: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    s3Client?: S3Client;
}

/**
 * Implements RedirectsStore against an S3-compatible bucket. Reads and
 * writes a single JSON object at the configured key.
 */
export class GCSStore implements RedirectsStore {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly key: string;

    constructor(options: GCSStoreOptions) {
        if (!options.bucket) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingBucket)
            });
        }

        this.bucket = options.bucket;
        this.key = options.key || DEFAULT_KEY;

        if (options.s3Client) {
            this.client = options.s3Client;
        } else {
            if (Boolean(options.accessKeyId) !== Boolean(options.secretAccessKey)) {
                throw new errors.IncorrectUsageError({
                    message: tpl(messages.partialCredentials)
                });
            }

            const clientConfig: S3ClientConfig = {
                region: options.region,
                endpoint: options.endpoint,
                forcePathStyle: options.forcePathStyle
            };

            if (options.accessKeyId && options.secretAccessKey) {
                clientConfig.credentials = {
                    accessKeyId: options.accessKeyId,
                    secretAccessKey: options.secretAccessKey,
                    sessionToken: options.sessionToken
                };
            }

            this.client = new S3Client(clientConfig);
        }
    }

    async getAll(): Promise<RedirectConfig[]> {
        let body: string;
        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: this.key
            }));
            if (!response.Body) {
                return [];
            }
            body = await response.Body.transformToString('utf-8');
        } catch (err) {
            if (err instanceof NoSuchKey) {
                return [];
            }
            throw err;
        }

        return parseJson(body);
    }

    async replaceAll(redirects: RedirectConfig[]): Promise<void> {
        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: this.key,
            Body: JSON.stringify(redirects),
            ContentType: 'application/json'
        }));
    }
}
