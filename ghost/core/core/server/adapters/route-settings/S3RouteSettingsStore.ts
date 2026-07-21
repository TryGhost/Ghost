import fs from 'fs-extra';
import path from 'path';
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
import {RouteSettingsStoreBase, type RouteSettings} from '@tryghost/adapter-base-route-settings';

import parseYaml from '../../services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../services/route-settings/route-settings-parser';
import {getBackupRouteSettingsFilePath} from './utils';

const YAML_FILENAME = 'routes.yaml';
const DEFAULT_SETTINGS_FILENAME = 'default-routes.yaml';

const CONTENT_TYPE = 'application/yaml; charset=utf-8';

const messages = {
    missingBucket: 'S3RouteSettingsStore requires a bucket name',
    missingStaticFileURLPrefix: 'S3RouteSettingsStore requires a staticFileURLPrefix',
    missingDefaultSettingsBasePath: 'S3RouteSettingsStore requires a defaultSettingsBasePath',
    partialCredentials: 'S3RouteSettingsStore requires both accessKeyId and secretAccessKey when either is provided',
    missingResponseBody: 'S3 GetObject returned no body',
    ensureDefaults: 'Error trying to access the default settings file in {path}.',
    requestFailed: 'Route settings storage request failed: {operation} returned {code}.'
};

const stripLeadingAndTrailingSlashes = (value = '') => value.replace(/^\/+|\/+$/g, '');

const configSchema = z.object({
    bucket: z.string({error: tpl(messages.missingBucket)}).min(1, {error: tpl(messages.missingBucket)}),
    staticFileURLPrefix: z.string({error: tpl(messages.missingStaticFileURLPrefix)})
        .transform(stripLeadingAndTrailingSlashes)
        .refine(value => value.length > 0, {error: tpl(messages.missingStaticFileURLPrefix)}),
    defaultSettingsBasePath: z.string({error: tpl(messages.missingDefaultSettingsBasePath)})
        .min(1, {error: tpl(messages.missingDefaultSettingsBasePath)}),
    tenantPrefix: z.string().transform(stripLeadingAndTrailingSlashes).optional(),
    region: z.string().optional(),
    endpoint: z.string().optional(),
    forcePathStyle: z.boolean().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    sessionToken: z.string().optional()
}).refine((config) => {
    const hasAccessKey = Boolean(config.accessKeyId);
    const hasSecretKey = Boolean(config.secretAccessKey);
    const hasSessionToken = Boolean(config.sessionToken);
    const hasCredentialPair = hasAccessKey && hasSecretKey;
    return !((hasAccessKey || hasSecretKey || hasSessionToken) && !hasCredentialPair);
}, {error: tpl(messages.partialCredentials)});

export type S3RouteSettingsStoreOptions = z.infer<typeof configSchema>;

/**
 * Remote store for route settings backed by an S3-compatible bucket (MinIO in
 * tests, GCS in production). Reads and writes the operator's original
 * `routes.yaml` verbatim.
 */
export default class S3RouteSettingsStore extends RouteSettingsStoreBase {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly staticFileURLPrefix: string;
    private readonly tenantPrefix: string;
    private readonly defaultSettingsBasePath: string;

    private static parseConfig(config: unknown): z.infer<typeof configSchema> {
        const result = configSchema.safeParse(config);
        if (!result.success) {
            throw new errors.IncorrectUsageError({
                message: [...new Set(result.error.issues.map(issue => issue.message))].join('; ')
            });
        }
        return result.data;
    }

    static validate(config: unknown): asserts config is S3RouteSettingsStoreOptions {
        S3RouteSettingsStore.parseConfig(config);
    }

    constructor(config: unknown) {
        super();

        const options = S3RouteSettingsStore.parseConfig(config);

        const hasCredentialPair = Boolean(options.accessKeyId) && Boolean(options.secretAccessKey);

        this.bucket = options.bucket;
        this.staticFileURLPrefix = options.staticFileURLPrefix;
        this.tenantPrefix = options.tenantPrefix ?? '';
        this.defaultSettingsBasePath = options.defaultSettingsBasePath;

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

    async get(): Promise<RouteSettings> {
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
                const defaultContent = await this.readDefaultSettings();
                return parseRouteSettings(parseYaml(defaultContent), defaultContent);
            }
            throw this.toStoreError(err, 'GetObject', this.buildKey());
        }

        return parseRouteSettings(parseYaml(body), body);
    }

    async replace(settings: RouteSettings): Promise<void> {
        const key = this.buildKey();

        if (await this._canonicalExists()) {
            const backupKey = getBackupRouteSettingsFilePath(key);
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
                Body: settings.yamlSource,
                ContentType: CONTENT_TYPE
            }));
        } catch (err) {
            throw this.toStoreError(err, 'PutObject', key);
        }
    }

    private buildKey(): string {
        const parts = [this.tenantPrefix, this.staticFileURLPrefix, YAML_FILENAME].filter(Boolean);
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
            if (this._isNotFound(err)) {
                return false;
            }
            throw this.toStoreError(err, 'HeadObject', key);
        }
    }

    private async readDefaultSettings(): Promise<string> {
        const defaultFilePath = path.join(this.defaultSettingsBasePath, DEFAULT_SETTINGS_FILENAME);
        try {
            return await fs.readFile(defaultFilePath, 'utf8');
        } catch (err) {
            throw new errors.InternalServerError({
                message: tpl(messages.ensureDefaults, {path: this.defaultSettingsBasePath}),
                err: err as Error,
                context: (err as NodeJS.ErrnoException).path
            });
        }
    }

    private _isNotFound(err: unknown): boolean {
        return err instanceof NotFound || err instanceof NoSuchKey;
    }

    /**
     * Convert an S3 failure into a Ghost error naming the operation, key and
     * S3 error code.
     *
     * The SDK's exceptions are deliberately *not* attached: they hold a
     * reference to the HTTP response, and the API error handler deep-clones
     * whatever it is given, so a raw SDK error makes the request die with
     * "Maximum call stack size exceeded" and the real cause never reaches the
     * operator. Everything useful is copied out by value instead.
     */
    private toStoreError(err: unknown, operation: string, key: string): Error {
        if (err instanceof Error && errors.utils.isGhostError(err)) {
            return err;
        }

        const s3Error = err as {name?: string; message?: string; $metadata?: {httpStatusCode?: number}};
        const code = s3Error.name || 'UnknownError';

        return new errors.InternalServerError({
            message: tpl(messages.requestFailed, {operation, code}),
            context: s3Error.message,
            code: 'ROUTE_SETTINGS_STORAGE_REQUEST_FAILED',
            errorDetails: {
                operation,
                bucket: this.bucket,
                key,
                s3ErrorCode: code,
                statusCode: s3Error.$metadata?.httpStatusCode
            }
        });
    }
}
