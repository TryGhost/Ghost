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
import {z} from 'zod';
import tpl from '@tryghost/tpl';
import * as errors from '@tryghost/errors';
import {RedirectsStoreBase, type RedirectConfig} from '@tryghost/adapter-base-redirects';

import {parseJson} from '../../services/custom-redirects/redirect-config-parser';
import {getBackupRedirectsFilePath} from '../../services/custom-redirects/utils';

const DEFAULT_FILENAME = 'redirects.json';

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
        const parts = [this.tenantPrefix, this.staticFileURLPrefix, DEFAULT_FILENAME].filter(Boolean);
        return parts.join('/');
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
