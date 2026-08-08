import {
    CopyObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
    S3ClientConfig
} from '@aws-sdk/client-s3';
import {z} from 'zod';
import tpl from '@tryghost/tpl';
import * as errors from '@tryghost/errors';
import {RedirectsStoreBase, type RedirectConfig} from '@tryghost/adapter-base-redirects';

import {parseJson} from '../../services/custom-redirects/redirect-config-parser';
import {getBackupRedirectsFilePath} from '../../services/custom-redirects/utils';
import {isS3NotFound, toS3RequestError, type S3Operation} from '../lib/s3/errors';

const DEFAULT_FILENAME = 'redirects.json';

const STORAGE_ERROR_CODE = 'REDIRECTS_STORAGE_REQUEST_FAILED';

const messages = {
    missingBucket: 'S3RedirectsStore requires a bucket name',
    missingStaticFileURLPrefix: 'S3RedirectsStore requires a staticFileURLPrefix',
    partialCredentials: 'S3RedirectsStore requires both accessKeyId and secretAccessKey when either is provided',
    missingResponseBody: 'S3 GetObject returned no body'
};

const stripLeadingAndTrailingSlashes = (value = '') => value.replace(/^\/+|\/+$/g, '');

// Validates and normalises the config: the slash-trimmed fields
// (`staticFileURLPrefix`, `tenantPrefix`) are stripped via `transform` so the
// constructor consumes ready-to-use values, plus the credential-pair rule
// (accessKeyId and secretAccessKey must be supplied together).
const configSchema = z.object({
    bucket: z.string({error: tpl(messages.missingBucket)}).min(1, {error: tpl(messages.missingBucket)}),
    staticFileURLPrefix: z.string({error: tpl(messages.missingStaticFileURLPrefix)})
        .transform(stripLeadingAndTrailingSlashes)
        .refine(value => value.length > 0, {error: tpl(messages.missingStaticFileURLPrefix)}),
    tenantPrefix: z.string().transform(stripLeadingAndTrailingSlashes).optional(),
    region: z.string().optional(),
    endpoint: z.string().optional(),
    forcePathStyle: z.boolean().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    sessionToken: z.string().optional()
}).refine((config) => {
    // accessKeyId and secretAccessKey must be supplied together (or not at all).
    const hasAccessKey = Boolean(config.accessKeyId);
    const hasSecretKey = Boolean(config.secretAccessKey);
    const hasSessionToken = Boolean(config.sessionToken);
    const hasCredentialPair = hasAccessKey && hasSecretKey;
    return !((hasAccessKey || hasSecretKey || hasSessionToken) && !hasCredentialPair);
}, {error: tpl(messages.partialCredentials)});

export type S3RedirectsStoreOptions = z.infer<typeof configSchema>;

/**
 * Implements RedirectsStore against an S3-compatible bucket. Reads and
 * writes a single JSON object at the configured key, keeping a
 * timestamped server-side copy of the previous contents on each
 * overwrite.
 */
export default class S3RedirectsStore extends RedirectsStoreBase {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly staticFileURLPrefix: string;
    private readonly tenantPrefix: string;

    /**
     * Parse + normalise the config, throwing an actionable IncorrectUsageError
     * on the first problem. Shared by `validate` (boot-time check) and the
     * constructor (which uses the normalised result).
     */
    private static parseConfig(config: unknown): z.infer<typeof configSchema> {
        const result = configSchema.safeParse(config);
        if (!result.success) {
            throw new errors.IncorrectUsageError({
                message: [...new Set(result.error.issues.map(issue => issue.message))].join('; ')
            });
        }
        return result.data;
    }

    /**
     * Validate the options S3RedirectsStore would be constructed with, without
     * instantiating it (no S3 client is created). Called by the adapter manager
     * at boot so misconfiguration fails early. Narrows `config` to
     * `S3RedirectsStoreOptions`.
     */
    static validate(config: unknown): asserts config is S3RedirectsStoreOptions {
        S3RedirectsStore.parseConfig(config);
    }

    constructor(config: unknown) {
        super();

        const options = S3RedirectsStore.parseConfig(config);

        const hasCredentialPair = Boolean(options.accessKeyId) && Boolean(options.secretAccessKey);

        this.bucket = options.bucket;
        this.staticFileURLPrefix = options.staticFileURLPrefix;
        this.tenantPrefix = options.tenantPrefix ?? '';

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
        // `s3Client` is a test-only injection seam — it never comes from config
        // (nconf holds static values), so it's read from the raw input rather
        // than the validated schema output.
        const injectedClient = (config as {s3Client?: S3Client} | null | undefined)?.s3Client;
        this.client = injectedClient || new S3Client(clientConfig);
    }

    async getAll(): Promise<RedirectConfig[]> {
        const key = this.buildKey();

        // Only the S3 call is wrapped, so the error helper only ever sees an SDK
        // failure and never has to decide whether an error is already ours.
        let response;
        try {
            response = await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));
        } catch (err) {
            if (isS3NotFound(err)) {
                return [];
            }
            throw this.toStoreError(err, 'GetObject', key);
        }

        if (!response.Body) {
            throw new errors.InternalServerError({
                message: tpl(messages.missingResponseBody)
            });
        }

        // Streaming the body is a second network round trip, so it fails
        // separately from the request that opened it — a reset partway through
        // rejects here, not above.
        let body: string;
        try {
            body = await response.Body.transformToString('utf-8');
        } catch (err) {
            throw this.toStoreError(err, 'GetObject', key);
        }

        return parseJson(body);
    }

    async replaceAll(redirects: RedirectConfig[]): Promise<void> {
        const key = this.buildKey();

        if (await this._canonicalExists()) {
            const backupKey = getBackupRedirectsFilePath(key);
            try {
                await this.client.send(new CopyObjectCommand({
                    Bucket: this.bucket,
                    Key: backupKey,
                    CopySource: `${this.bucket}/${key}`
                }));
            } catch (err) {
                throw this.toStoreError(err, 'CopyObject', backupKey);
            }
        }

        try {
            await this.client.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: JSON.stringify(redirects),
                ContentType: 'application/json'
            }));
        } catch (err) {
            throw this.toStoreError(err, 'PutObject', key);
        }
    }

    private buildKey(): string {
        const parts = [this.tenantPrefix, this.staticFileURLPrefix, DEFAULT_FILENAME].filter(Boolean);
        return parts.join('/');
    }

    private async _canonicalExists(): Promise<boolean> {
        const key = this.buildKey();
        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));
            return true;
        } catch (err) {
            if (isS3NotFound(err)) {
                return false;
            }
            throw this.toStoreError(err, 'HeadObject', key);
        }
    }

    private toStoreError(err: unknown, operation: S3Operation, key: string): errors.InternalServerError {
        return toS3RequestError(err, {
            operation,
            bucket: this.bucket,
            key,
            resource: DEFAULT_FILENAME,
            errorCode: STORAGE_ERROR_CODE
        });
    }
}
