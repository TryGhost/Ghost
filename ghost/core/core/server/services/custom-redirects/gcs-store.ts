import {
    CopyObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    NoSuchKey,
    NotFound,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import tpl from '@tryghost/tpl';
import * as errors from '@tryghost/errors';

import {parseJson} from './redirect-config-parser';
import {getBackupRedirectsFilePath} from './utils';
import type {RedirectConfig, RedirectsStore} from './types';

const DEFAULT_KEY = 'redirects.json';

const messages = {
    missingBucket: 'GCSStore requires a bucket name',
    missingClient: 'GCSStore requires an S3 client',
    missingResponseBody: 'S3 GetObject returned no body'
};

export interface GCSStoreOptions {
    bucket: string;
    s3Client: S3Client;
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
    private readonly getBackupKey: (key: string) => string;

    constructor(options: GCSStoreOptions) {
        if (!options.bucket) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingBucket)
            });
        }
        if (!options.s3Client) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingClient)
            });
        }

        this.bucket = options.bucket;
        this.client = options.s3Client;
        this.getBackupKey = options.getBackupKey || getBackupRedirectsFilePath;
    }

    async getAll(): Promise<RedirectConfig[]> {
        let body: string;
        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: DEFAULT_KEY
            }));
            if (!response.Body) {
                throw new errors.InternalServerError({
                    message: tpl(messages.missingResponseBody)
                });
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
                Key: this.getBackupKey(DEFAULT_KEY),
                CopySource: `${this.bucket}/${DEFAULT_KEY}`
            }));
        }

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: DEFAULT_KEY,
            Body: JSON.stringify(redirects),
            ContentType: 'application/json'
        }));
    }

    private async _canonicalExists(): Promise<boolean> {
        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: DEFAULT_KEY
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
