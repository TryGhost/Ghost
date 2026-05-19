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

import RedirectsStoreBase from './RedirectsStoreBase';
import {parseJson} from '../../services/custom-redirects/redirect-config-parser';
import {getBackupRedirectsFilePath} from '../../services/custom-redirects/utils';
import type {RedirectConfig, RedirectsStore} from '../../services/custom-redirects/types';

const DEFAULT_FILENAME = 'redirects.json';

const messages = {
    missingBucket: 'GCSStore requires a bucket name',
    partialCredentials: 'GCSStore requires both accessKeyId and secretAccessKey when either is provided',
    missingResponseBody: 'S3 GetObject returned no body'
};

const stripLeadingAndTrailingSlashes = (value = '') => value.replace(/^\/+|\/+$/g, '');

export interface GCSStoreOptions {
    bucket: string;
    region?: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    tenantPrefix?: string;
}

/**
 * Implements RedirectsStore against an S3-compatible bucket. Reads and
 * writes a single JSON object at the configured key, keeping a
 * timestamped server-side copy of the previous contents on each
 * overwrite.
 */
export default class GCSStore extends RedirectsStoreBase implements RedirectsStore {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly tenantPrefix: string;

    constructor(options: GCSStoreOptions) {
        super();
        if (!options.bucket) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingBucket)
            });
        }

        const hasAccessKey = Boolean(options.accessKeyId);
        const hasSecretKey = Boolean(options.secretAccessKey);
        const hasSessionToken = Boolean(options.sessionToken);
        const hasCredentialPair = hasAccessKey && hasSecretKey;
        if ((hasAccessKey || hasSecretKey || hasSessionToken) && !hasCredentialPair) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.partialCredentials)
            });
        }

        this.bucket = options.bucket;
        this.tenantPrefix = stripLeadingAndTrailingSlashes(options.tenantPrefix);

        const clientConfig: S3ClientConfig = {
            region: options.region,
            endpoint: options.endpoint,
            forcePathStyle: options.forcePathStyle
        };
        if (hasCredentialPair) {
            clientConfig.credentials = {
                accessKeyId: options.accessKeyId!,
                secretAccessKey: options.secretAccessKey!,
                sessionToken: options.sessionToken
            };
        }
        this.client = new S3Client(clientConfig);
    }

    async getAll(): Promise<RedirectConfig[]> {
        let body: string;
        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: this.buildKey()
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
        const key = this.buildKey();

        if (await this._canonicalExists()) {
            await this.client.send(new CopyObjectCommand({
                Bucket: this.bucket,
                Key: getBackupRedirectsFilePath(key),
                CopySource: `${this.bucket}/${key}`
            }));
        }

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: JSON.stringify(redirects),
            ContentType: 'application/json'
        }));
    }

    private buildKey(): string {
        if (!this.tenantPrefix) {
            return DEFAULT_FILENAME;
        }

        return `${this.tenantPrefix}/${DEFAULT_FILENAME}`;
    }

    private async _canonicalExists(): Promise<boolean> {
        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: this.buildKey()
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
