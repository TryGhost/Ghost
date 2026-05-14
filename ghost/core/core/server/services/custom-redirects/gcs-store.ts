import {
    CopyObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    NoSuchKey,
    NotFound,
    PutObjectCommand,
    S3Client,
    S3ClientConfig
} from '@aws-sdk/client-s3';
import tpl from '@tryghost/tpl';
import * as errors from '@tryghost/errors';

import {parseJson} from './redirect-config-parser';
import {getBackupRedirectsFilePath} from './utils';
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
    getBackupKey?: (key: string) => string;
}

/**
 * Implements RedirectsStore against an S3-compatible bucket. Reads and
 * writes a single JSON object at the configured key, keeping a
 * timestamped server-side copy of the previous contents on each
 * overwrite.
 */
export class GCSStore implements RedirectsStore {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly key: string;
    private readonly getBackupKey: (key: string) => string;

    constructor(options: GCSStoreOptions) {
        if (!options.bucket) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingBucket)
            });
        }

        this.bucket = options.bucket;
        this.key = options.key || DEFAULT_KEY;
        this.getBackupKey = options.getBackupKey || getBackupRedirectsFilePath;

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
            if (this._isNotFound(err)) {
                return [];
            }
            throw err;
        }

        return parseJson(body);
    }

    async replaceAll(redirects: RedirectConfig[]): Promise<void> {
        if (await this._canonicalExists()) {
            await this.client.send(new CopyObjectCommand({
                Bucket: this.bucket,
                Key: this.getBackupKey(this.key),
                CopySource: `${this.bucket}/${this.key}`
            }));
        }

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: this.key,
            Body: JSON.stringify(redirects),
            ContentType: 'application/json'
        }));
    }

    private async _canonicalExists(): Promise<boolean> {
        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: this.key
            }));
            return true;
        } catch (err) {
            if (this._isNotFound(err)) {
                return false;
            }
            throw err;
        }
    }

    private _isNotFound(err: unknown): boolean {
        return err instanceof NotFound || err instanceof NoSuchKey;
    }
}
