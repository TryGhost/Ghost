import fs from 'node:fs';
import path from 'node:path';
import type {Request, Response, NextFunction, RequestHandler} from 'express';
import {z} from 'zod';
import {StorageBase} from 'ghost-storage-base';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    NotFound,
    NoSuchKey,
    PutObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    S3Client,
    S3ClientConfig
} from '@aws-sdk/client-s3';

// Minimum chunk size for multipart uploads (5 MiB) - required by S3/GCS
// GCS limits: https://docs.cloud.google.com/storage/quotas#requests
const MIN_MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024;

const messages = {
    invalidUrlParameter: 'The URL "{url}" is not a valid URL for this site.',
    missingBucket: 'S3Storage requires a bucket name',
    missingStaticFileURLPrefix: 'S3Storage requires a staticFileURLPrefix',
    missingCdnUrl: 'S3Storage requires a cdnUrl option',
    missingTenantPrefix: 'URL is missing expected tenant prefix "{tenantPrefix}": {url}',
    missingStoragePath: 'URL is missing expected storagePath "{storagePath}": {url}',
    emptyTargetPath: 'S3Storage.saveRaw requires a non-empty targetPath',
    emptyFileName: 'S3Storage.{method} requires a non-empty fileName',
    emptyRelativePath: 'S3Storage.buildKey requires a non-empty relativePath',
    emptyReadPath: 'S3Storage.read requires a non-empty path',
    readNotFound: 'Could not read file: {path}',
    multipartUploadInitFailed: 'Failed to initiate file upload.',
    multipartUploadPartFailed: 'Failed to upload file part {partNumber}.',
    multipartUploadReadFailed: 'There was an error uploading the file. The file may have been modified or removed during upload.',
    missingMultipartThreshold: 'S3Storage requires multipartUploadThresholdBytes option',
    missingMultipartChunkSize: 'S3Storage requires multipartChunkSizeBytes option',
    multipartChunkSizeTooSmall: 'S3Storage multipartChunkSizeBytes must be at least 5 MiB (5242880 bytes)',
    multipartThresholdNotInteger: 'S3Storage multipartUploadThresholdBytes must be an integer',
    multipartChunkSizeNotInteger: 'S3Storage multipartChunkSizeBytes must be an integer',
    partialCredentials: 'S3Storage requires both accessKeyId and secretAccessKey when either is provided'
};

const stripLeadingAndTrailingSlashes = (value = '') => value.replace(/^\/+|\/+$/g, '');

const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');

interface UploadFile {
    name: string;
    path: string;
    type?: string;
}

// Validates and normalises the S3Storage config. The slash-trimmed fields
// (`staticFileURLPrefix`, `cdnUrl`, `tenantPrefix`) are stripped via `transform`
// so the constructor consumes ready-to-use values, and the required-field guards
// run against the trimmed result.
const configSchema = z.object({
    bucket: z.string({error: tpl(messages.missingBucket)}).min(1, {error: tpl(messages.missingBucket)}),
    staticFileURLPrefix: z.string({error: tpl(messages.missingStaticFileURLPrefix)})
        .transform(stripLeadingAndTrailingSlashes)
        .refine(value => value.length > 0, {error: tpl(messages.missingStaticFileURLPrefix)}),
    cdnUrl: z.string({error: tpl(messages.missingCdnUrl)})
        .transform(stripTrailingSlash)
        .refine(value => value.length > 0, {error: tpl(messages.missingCdnUrl)}),
    multipartUploadThresholdBytes: z.number({error: tpl(messages.missingMultipartThreshold)})
        .int({error: tpl(messages.multipartThresholdNotInteger)})
        .positive({error: tpl(messages.missingMultipartThreshold)}),
    multipartChunkSizeBytes: z.number({error: tpl(messages.missingMultipartChunkSize)})
        .int({error: tpl(messages.multipartChunkSizeNotInteger)})
        .check((ctx) => {
            // Emit a single issue: a falsy value reads as "missing", a positive
            // value below the floor as "too small".
            if (!ctx.value) {
                ctx.issues.push({code: 'custom', message: tpl(messages.missingMultipartChunkSize), input: ctx.value});
            } else if (ctx.value < MIN_MULTIPART_CHUNK_SIZE) {
                ctx.issues.push({code: 'custom', message: tpl(messages.multipartChunkSizeTooSmall), input: ctx.value});
            }
        }),
    tenantPrefix: z.string().transform(stripLeadingAndTrailingSlashes).optional(),
    region: z.string().optional(),
    endpoint: z.string().optional(),
    forcePathStyle: z.boolean().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    sessionToken: z.string().optional()
}).refine((config) => {
    // accessKeyId and secretAccessKey must be supplied together (or not at all) —
    // a partial pair would silently fall back to ambient AWS credentials.
    const hasAccessKey = Boolean(config.accessKeyId);
    const hasSecretKey = Boolean(config.secretAccessKey);
    const hasSessionToken = Boolean(config.sessionToken);
    const hasCredentialPair = hasAccessKey && hasSecretKey;
    return !((hasAccessKey || hasSecretKey || hasSessionToken) && !hasCredentialPair);
}, {error: tpl(messages.partialCredentials)});

export type S3StorageOptions = z.infer<typeof configSchema>;

export default class S3Storage extends StorageBase {
    private readonly client: S3Client;

    private readonly bucket: string;

    private readonly tenantPrefix: string;

    private readonly cdnUrl: string;

    public readonly staticFileURLPrefix: string;

    private readonly multipartUploadThresholdBytes: number;

    private readonly multipartChunkSizeBytes: number;

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
     * Validate the options S3Storage would be constructed with, without
     * instantiating it (no S3 client is created). Called by the adapter manager
     * at boot so misconfiguration fails early. Narrows `config` to
     * `S3StorageOptions`.
     */
    static validate(config: unknown): asserts config is S3StorageOptions {
        S3Storage.parseConfig(config);
    }

    constructor(config: unknown) {
        super();

        const options = S3Storage.parseConfig(config);

        this.bucket = options.bucket;
        this.tenantPrefix = options.tenantPrefix ?? '';
        this.staticFileURLPrefix = options.staticFileURLPrefix;
        this.storagePath = options.staticFileURLPrefix;
        this.cdnUrl = options.cdnUrl;
        this.multipartUploadThresholdBytes = options.multipartUploadThresholdBytes;
        this.multipartChunkSizeBytes = options.multipartChunkSizeBytes;

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

        // `s3Client` is a test-only injection seam — it never comes from config
        // (nconf holds static values), so it's read from the raw input rather
        // than the validated schema output.
        const injectedClient = (config as {s3Client?: S3Client} | null | undefined)?.s3Client;
        this.client = injectedClient || new S3Client(clientConfig);
    }

    async save(file: UploadFile, targetDir?: string): Promise<string> {
        const dir = targetDir || this.getTargetDir();
        const relativePath = await this.getUniqueFileName(file, dir);

        const key = this.buildKey(relativePath);
        const stats = await fs.promises.stat(file.path);

        if (stats.size >= this.multipartUploadThresholdBytes) {
            logging.info(`Large file, using multipart upload: file=${key} size=${stats.size} threshold=${this.multipartUploadThresholdBytes}`);
            return await this.uploadMultipart(file, key);
        }

        logging.info(`Small file, using simple upload: file=${key} size=${stats.size} threshold=${this.multipartUploadThresholdBytes}`);
        const body = await fs.promises.readFile(file.path);

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: file.type
        }));

        return `${this.cdnUrl}/${key}`;
    }

    private async *readFileInChunks(filePath: string, chunkSize: number): AsyncGenerator<Buffer> {
        const stream = fs.createReadStream(filePath, {highWaterMark: chunkSize});
        let buffer = Buffer.alloc(0);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk as Buffer]);

            while (buffer.length >= chunkSize) {
                yield buffer.slice(0, chunkSize);
                buffer = buffer.slice(chunkSize);
            }
        }

        if (buffer.length > 0) {
            yield buffer;
        }
    }

    private async uploadMultipart(file: UploadFile, key: string): Promise<string> {
        const createResponse = await this.client.send(new CreateMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: file.type
        }));

        const uploadId = createResponse.UploadId;
        if (!uploadId) {
            throw new errors.InternalServerError({
                message: tpl(messages.multipartUploadInitFailed)
            });
        }

        try {
            const parts: {ETag: string; PartNumber: number}[] = [];
            let partNumber = 1;
            const chunks = this.readFileInChunks(file.path, this.multipartChunkSizeBytes);

            for await (const chunk of chunks) {
                const uploadPartResponse = await this.client.send(new UploadPartCommand({
                    Bucket: this.bucket,
                    Key: key,
                    UploadId: uploadId,
                    PartNumber: partNumber,
                    Body: chunk
                }));

                if (!uploadPartResponse.ETag) {
                    throw new errors.InternalServerError({
                        message: tpl(messages.multipartUploadPartFailed, {partNumber})
                    });
                }

                parts.push({
                    ETag: uploadPartResponse.ETag,
                    PartNumber: partNumber
                });

                partNumber += 1;
            }

            await this.client.send(new CompleteMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: parts
                }
            }));

            logging.info(`Multipart upload completed: file=${key} parts=${parts.length}`);
            return `${this.cdnUrl}/${key}`;
        } catch (error) {
            logging.warn(`Aborting multipart upload: file=${key} uploadId=${uploadId}`);
            try {
                await this.client.send(new AbortMultipartUploadCommand({
                    Bucket: this.bucket,
                    Key: key,
                    UploadId: uploadId
                }));
            } catch (abortError) {
                logging.error(`Failed to abort multipart upload: file=${key} uploadId=${uploadId}`, abortError);
            }
            throw error;
        }
    }

    async saveRaw(buffer: Buffer, targetPath: string): Promise<string> {
        if (!targetPath?.trim()) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.emptyTargetPath)
            });
        }

        const key = this.buildKey(targetPath);

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer
        }));

        return `${this.cdnUrl}/${key}`;
    }

    /**
     * Converts a CDN URL to a relative path, stripping CDN URL, tenant prefix, and storagePath.
     *
     * Example: 'https://cdn.example.com/tenant/content/files/2024/06/video.mp4' → '2024/06/video.mp4'
     */
    urlToPath(url: string): string {
        if (!url.startsWith(`${this.cdnUrl}/`)) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidUrlParameter, {url})
            });
        }

        let relativePath = url.slice(this.cdnUrl.length + 1);

        if (this.tenantPrefix) {
            if (!relativePath.startsWith(`${this.tenantPrefix}/`)) {
                throw new errors.IncorrectUsageError({
                    message: tpl(messages.missingTenantPrefix, {tenantPrefix: this.tenantPrefix, url})
                });
            }
            relativePath = relativePath.slice(this.tenantPrefix.length + 1);
        }

        if (!relativePath.startsWith(`${this.storagePath}/`)) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingStoragePath, {storagePath: this.storagePath, url})
            });
        }

        const result = relativePath.slice(this.storagePath.length + 1);

        const normalized = path.posix.normalize(result);
        if (normalized.startsWith('..')) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidUrlParameter, {url})
            });
        }

        return normalized;
    }

    async exists(fileName: string, targetDir?: string): Promise<boolean> {
        if (!fileName?.trim()) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.emptyFileName, {method: 'exists'})
            });
        }

        const relativePath = targetDir ? path.posix.join(targetDir, fileName) : fileName;
        const key = this.buildKey(relativePath);

        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));
            return true;
        } catch (error) {
            if (this.isNotFound(error)) {
                return false;
            }

            throw error;
        }
    }

    serve(): RequestHandler {
        return (req: Request, res: Response, next: NextFunction) => {
            const relativePath = req.path.replace(/^\/+/, '');

            if (!relativePath) {
                return next();
            }

            const key = this.buildKey(relativePath);
            return res.redirect(301, `${this.cdnUrl}/${key}`);
        };
    }

    async delete(fileName: string, targetDir?: string): Promise<void> {
        if (!fileName?.trim()) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.emptyFileName, {method: 'delete'})
            });
        }

        const relativePath = targetDir ? path.posix.join(targetDir, fileName) : fileName;
        const key = this.buildKey(relativePath);

        try {
            await this.client.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));
        } catch (error) {
            if (!this.isNotFound(error)) {
                throw error;
            }
        }
    }

    /**
     * Reads an object's bytes from S3. Used by image dimension lookups, which
     * fall back to reading from storage for images served via the CDN.
     */
    async read(options: {path?: string} = {}): Promise<Buffer> {
        const relativePath = options.path;

        if (!relativePath?.trim()) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.emptyReadPath)
            });
        }

        const key = this.buildKey(relativePath);

        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));

            const bytes = await response.Body?.transformToByteArray();
            return Buffer.from(bytes ?? []);
        } catch (error) {
            if (this.isNotFound(error)) {
                throw new errors.NotFoundError({
                    err: error,
                    message: tpl(messages.readNotFound, {path: relativePath})
                });
            }

            throw error;
        }
    }

    private buildKey(relativePath: string): string {
        if (!relativePath) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.emptyRelativePath)
            });
        }

        const pathWithStorage = path.posix.join(this.storagePath, this.toCanonicalRelativePath(relativePath));

        if (!pathWithStorage.startsWith(this.storagePath + '/') && pathWithStorage !== this.storagePath) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidUrlParameter, {url: relativePath})
            });
        }

        if (!this.tenantPrefix) {
            return pathWithStorage;
        }

        return `${this.tenantPrefix}/${pathWithStorage}`;
    }

    private toCanonicalRelativePath(input: string): string {
        return this.fromAbsoluteFilesystemPath(input)
            ?? this.fromStoragePathPrefixed(input)
            ?? this.fromLeadingSlashPath(input)
            ?? input;
    }

    private fromAbsoluteFilesystemPath(input: string): string | null {
        if (!path.posix.isAbsolute(input)) {
            return null;
        }
        const marker = `/${this.storagePath}/`;
        const idx = input.lastIndexOf(marker);
        if (idx !== -1) {
            return input.slice(idx + marker.length);
        }
        if (input.endsWith(`/${this.storagePath}`)) {
            return '';
        }
        return null;
    }

    private fromStoragePathPrefixed(input: string): string | null {
        if (input === this.storagePath || input.startsWith(`${this.storagePath}/`)) {
            return path.posix.relative(this.storagePath, input);
        }
        return null;
    }

    private fromLeadingSlashPath(input: string): string | null {
        if (!path.posix.isAbsolute(input)) {
            return null;
        }
        return input.replace(/^\/+/, '');
    }

    private isNotFound(error: unknown): error is NotFound | NoSuchKey {
        return error instanceof NotFound || error instanceof NoSuchKey;
    }
}
