import fs from 'node:fs';
import path from 'node:path';
import StorageBase from 'ghost-storage-base';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {
    DeleteObjectCommand,
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
    readNotSupported: 'read() is not supported by S3Storage. S3Storage is designed for media and files, not images. Use LocalImagesStorage for image storage.',
    multipartUploadInitFailed: 'Failed to initiate file upload.',
    multipartUploadPartFailed: 'Failed to upload file part {partNumber}.',
    multipartUploadReadFailed: 'There was an error uploading the file. The file may have been modified or removed during upload.',
    missingMultipartThreshold: 'S3Storage requires multipartUploadThresholdBytes option',
    missingMultipartChunkSize: 'S3Storage requires multipartChunkSizeBytes option',
    multipartChunkSizeTooSmall: 'S3Storage multipartChunkSizeBytes must be at least 5 MiB (5242880 bytes)'
};

const stripLeadingAndTrailingSlashes = (value = '') => value.replace(/^\/+|\/+$/g, '');

const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');

interface UploadFile {
    name: string;
    path: string;
    type?: string;
}

export interface S3StorageOptions {
    bucket: string;
    cdnUrl: string;
    staticFileURLPrefix: string;
    region?: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    tenantPrefix?: string;
    s3Client?: S3Client;
    multipartUploadThresholdBytes: number;
    multipartChunkSizeBytes: number;
}

export default class S3Storage extends StorageBase {
    private readonly client: S3Client;

    private readonly bucket: string;

    private readonly tenantPrefix: string;

    private readonly cdnUrl: string;

    public readonly staticFileURLPrefix: string;

    private readonly multipartUploadThresholdBytes: number;

    private readonly multipartChunkSizeBytes: number;

    constructor(options: S3StorageOptions) {
        super();

        if (!options.bucket) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingBucket)
            });
        }

        this.bucket = options.bucket;
        this.tenantPrefix = stripLeadingAndTrailingSlashes(options.tenantPrefix);

        const staticFileURLPrefix = stripLeadingAndTrailingSlashes(options.staticFileURLPrefix);
        if (!staticFileURLPrefix) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingStaticFileURLPrefix)
            });
        }

        this.staticFileURLPrefix = staticFileURLPrefix;

        this.storagePath = staticFileURLPrefix;

        this.cdnUrl = stripTrailingSlash(options.cdnUrl || '');
        if (!this.cdnUrl) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingCdnUrl)
            });
        }

        if (!options.multipartUploadThresholdBytes) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingMultipartThreshold)
            });
        }
        this.multipartUploadThresholdBytes = options.multipartUploadThresholdBytes;

        if (!options.multipartChunkSizeBytes) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingMultipartChunkSize)
            });
        }
        if (options.multipartChunkSizeBytes < MIN_MULTIPART_CHUNK_SIZE) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.multipartChunkSizeTooSmall)
            });
        }
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

        this.client = options.s3Client || new S3Client(clientConfig);
    }

    async save(file: UploadFile, targetDir?: string): Promise<string> {
        const uploadStart = Date.now();
        logging.info(`[S3Storage] save() started: file=${file.name}`);

        const dir = targetDir || this.getTargetDir();
        const relativePath = await this.getUniqueFileName(file, dir);

        const key = this.buildKey(relativePath);

        const statStart = Date.now();
        const stats = await fs.promises.stat(file.path);
        const statDuration = Date.now() - statStart;
        logging.info(`[S3Storage] fs.stat completed: file=${key} size=${stats.size} duration=${statDuration}ms`);

        if (stats.size >= this.multipartUploadThresholdBytes) {
            logging.info(`[S3Storage] Large file, using multipart upload: file=${key} size=${stats.size} threshold=${this.multipartUploadThresholdBytes}`);
            const result = await this.uploadMultipart(file, key);
            const totalDuration = Date.now() - uploadStart;
            logging.info(`[S3Storage] save() completed (multipart): file=${key} totalDuration=${totalDuration}ms`);
            return result;
        }

        logging.info(`[S3Storage] Small file, using simple upload: file=${key} size=${stats.size} threshold=${this.multipartUploadThresholdBytes}`);

        const readStart = Date.now();
        const body = await fs.promises.readFile(file.path);
        const readDuration = Date.now() - readStart;
        logging.info(`[S3Storage] fs.readFile completed: file=${key} size=${body.length} duration=${readDuration}ms`);

        const uploadStart2 = Date.now();
        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: file.type
        }));
        const uploadDuration = Date.now() - uploadStart2;
        logging.info(`[S3Storage] PutObjectCommand completed: file=${key} duration=${uploadDuration}ms`);

        const totalDuration = Date.now() - uploadStart;
        logging.info(`[S3Storage] save() completed (simple): file=${key} totalDuration=${totalDuration}ms`);
        return `${this.cdnUrl}/${key}`;
    }

    private async *readFileInChunks(filePath: string, chunkSize: number): AsyncGenerator<Buffer> {
        const readStart = Date.now();
        logging.info(`[S3Storage] readFileInChunks() started: file=${filePath} targetChunkSize=${chunkSize}`);

        const stream = fs.createReadStream(filePath, {highWaterMark: chunkSize});
        let buffer = Buffer.alloc(0);
        let streamChunksRead = 0;
        let totalStreamBytesRead = 0;
        let bufferConcatCount = 0;
        let bufferConcatTime = 0;
        let bufferSliceCount = 0;
        let bufferSliceTime = 0;
        let yieldedChunks = 0;

        for await (const chunk of stream) {
            streamChunksRead += 1;
            const chunkLength = (chunk as Buffer).length;
            totalStreamBytesRead += chunkLength;

            const beforeConcatSize = buffer.length;
            const concatStart = Date.now();
            buffer = Buffer.concat([buffer, chunk as Buffer]);
            bufferConcatTime += Date.now() - concatStart;
            bufferConcatCount += 1;

            logging.info(`[S3Storage] readFileInChunks stream chunk: streamChunk=${streamChunksRead} streamChunkSize=${chunkLength} bufferBeforeConcat=${beforeConcatSize} bufferAfterConcat=${buffer.length} concatDuration=${Date.now() - concatStart}ms`);

            while (buffer.length >= chunkSize) {
                const slice1Start = Date.now();
                const chunkToYield = buffer.slice(0, chunkSize);
                bufferSliceTime += Date.now() - slice1Start;
                bufferSliceCount += 1;

                const slice2Start = Date.now();
                buffer = buffer.slice(chunkSize);
                bufferSliceTime += Date.now() - slice2Start;
                bufferSliceCount += 1;

                yieldedChunks += 1;
                logging.info(`[S3Storage] readFileInChunks yielding chunk: chunk=${yieldedChunks} size=${chunkSize} bufferRemaining=${buffer.length}`);
                yield chunkToYield;
            }
        }

        if (buffer.length > 0) {
            yieldedChunks += 1;
            logging.info(`[S3Storage] readFileInChunks yielding final chunk: chunk=${yieldedChunks} size=${buffer.length}`);
            yield buffer;
        }

        const readDuration = Date.now() - readStart;
        logging.info(`[S3Storage] readFileInChunks() completed: file=${filePath} totalDuration=${readDuration}ms streamChunksRead=${streamChunksRead} totalStreamBytes=${totalStreamBytesRead} bufferConcats=${bufferConcatCount} bufferConcatTime=${bufferConcatTime}ms bufferSlices=${bufferSliceCount} bufferSliceTime=${bufferSliceTime}ms yielded=${yieldedChunks}`);
    }

    private async uploadMultipart(file: UploadFile, key: string): Promise<string> {
        const multipartStart = Date.now();
        logging.info(`[S3Storage] uploadMultipart() started: file=${key} chunkSize=${this.multipartChunkSizeBytes}`);

        const createStart = Date.now();
        const createResponse = await this.client.send(new CreateMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: file.type
        }));
        const createDuration = Date.now() - createStart;
        logging.info(`[S3Storage] CreateMultipartUploadCommand completed: file=${key} duration=${createDuration}ms`);

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

            const partsStart = Date.now();
            let totalUploadTime = 0;

            for await (const chunk of chunks) {
                const partStart = Date.now();

                const uploadPartStart = Date.now();
                const uploadPartResponse = await this.client.send(new UploadPartCommand({
                    Bucket: this.bucket,
                    Key: key,
                    UploadId: uploadId,
                    PartNumber: partNumber,
                    Body: chunk
                }));
                const uploadPartDuration = Date.now() - uploadPartStart;
                totalUploadTime += uploadPartDuration;

                if (!uploadPartResponse.ETag) {
                    throw new errors.InternalServerError({
                        message: tpl(messages.multipartUploadPartFailed, {partNumber})
                    });
                }

                parts.push({
                    ETag: uploadPartResponse.ETag,
                    PartNumber: partNumber
                });

                const partDuration = Date.now() - partStart;
                logging.info(`[S3Storage] UploadPartCommand completed: file=${key} part=${partNumber} size=${chunk.length} uploadDuration=${uploadPartDuration}ms totalPartDuration=${partDuration}ms`);

                partNumber += 1;
            }

            const partsDuration = Date.now() - partsStart;
            logging.info(`[S3Storage] All parts uploaded: file=${key} totalParts=${parts.length} totalPartsDuration=${partsDuration}ms totalUploadTime=${totalUploadTime}ms`);

            const completeStart = Date.now();
            await this.client.send(new CompleteMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: parts
                }
            }));
            const completeDuration = Date.now() - completeStart;
            logging.info(`[S3Storage] CompleteMultipartUploadCommand completed: file=${key} duration=${completeDuration}ms`);

            const multipartDuration = Date.now() - multipartStart;
            logging.info(`[S3Storage] uploadMultipart() completed: file=${key} parts=${parts.length} totalDuration=${multipartDuration}ms`);
            return `${this.cdnUrl}/${key}`;
        } catch (error) {
            logging.warn(`[S3Storage] Aborting multipart upload: file=${key} uploadId=${uploadId}`);
            try {
                await this.client.send(new AbortMultipartUploadCommand({
                    Bucket: this.bucket,
                    Key: key,
                    UploadId: uploadId
                }));
            } catch (abortError) {
                logging.error(`[S3Storage] Failed to abort multipart upload: file=${key} uploadId=${uploadId}`, abortError);
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

        logging.info(`[S3Storage] saveRaw() started: file=${key} size=${buffer.length}`);
        const uploadStart = Date.now();
        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer
        }));
        const uploadDuration = Date.now() - uploadStart;
        logging.info(`[S3Storage] saveRaw() completed: file=${key} duration=${uploadDuration}ms`);

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

        return relativePath.slice(this.storagePath.length + 1);
    }

    async exists(fileName: string, targetDir: string): Promise<boolean> {
        if (!fileName?.trim()) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.emptyFileName, {method: 'exists'})
            });
        }

        const relativePath = path.posix.join(targetDir, fileName);
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

    serve() {
        return function (_req: unknown, _res: unknown, next: (err?: unknown) => void) {
            next();
        };
    }

    async delete(fileName: string, targetDir: string): Promise<void> {
        if (!fileName?.trim()) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.emptyFileName, {method: 'delete'})
            });
        }

        const relativePath = path.posix.join(targetDir, fileName);
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
     * Not supported - S3Storage is for media/files only. Images use LocalImagesStorage.
     */
    async read(): Promise<Buffer> {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.readNotSupported)
        });
    }

    private buildKey(relativePath: string): string {
        if (!relativePath) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.emptyRelativePath)
            });
        }

        const pathWithStorage = path.posix.join(this.storagePath, relativePath);

        if (!this.tenantPrefix) {
            return pathWithStorage;
        }

        return `${this.tenantPrefix}/${pathWithStorage}`;
    }

    private isNotFound(error: unknown): boolean {
        return error instanceof NotFound || error instanceof NoSuchKey;
    }
}
