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
    multipartUploadReadFailed: 'There was an error uploading the file. The file may have been modified or removed during upload.'
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
    multipartUploadThresholdBytes?: number;
    multipartChunkSizeBytes?: number;
}

export default class S3Storage extends StorageBase {
    private readonly client: S3Client;

    private readonly bucket: string;

    private readonly tenantPrefix: string;

    private readonly cdnUrl: string;

    public readonly staticFileURLPrefix: string;

    private readonly multipartThreshold: number;

    private readonly partSize: number;

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

        // 10MB threshold - files larger than this use multipart upload
        this.multipartThreshold = options.multipartUploadThresholdBytes || 10 * 1024 * 1024;
        // 10MB part size - each part uploaded separately to keep memory low
        this.partSize = options.multipartChunkSizeBytes || 10 * 1024 * 1024;

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
        const dir = targetDir || this.getTargetDir();
        const relativePath = await this.getUniqueFileName(file, dir);

        const key = this.buildKey(relativePath);
        const stats = await fs.promises.stat(file.path);

        if (stats.size >= this.multipartThreshold) {
            logging.info(`Large file (${Math.round(stats.size / 1024 / 1024)}MB), using multipart upload...`);
            return await this.uploadMultipart(file, key, stats.size);
        }

        logging.info(`Small file (${Math.round(stats.size / 1024)}KB), using simple upload...`);
        const body = await fs.promises.readFile(file.path);

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: file.type
        }));

        return `${this.cdnUrl}/${key}`;
    }

    private async uploadMultipart(file: UploadFile, key: string, fileSize: number): Promise<string> {
        let uploadId: string | undefined;

        try {
            const createResponse = await this.client.send(new CreateMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: file.type
            }));

            uploadId = createResponse.UploadId;
            if (!uploadId) {
                throw new errors.InternalServerError({
                    message: tpl(messages.multipartUploadInitFailed)
                });
            }

            const parts: {ETag: string; PartNumber: number}[] = [];
            const fileHandle = await fs.promises.open(file.path, 'r');
            
            try {
                let partNumber = 1;
                let uploadedBytes = 0;

                while (uploadedBytes < fileSize) {
                    const remainingBytes = fileSize - uploadedBytes;
                    const currentPartSize = Math.min(this.partSize, remainingBytes);
                    const buffer = Buffer.alloc(currentPartSize);
                    
                    const {bytesRead} = await fileHandle.read(buffer, 0, currentPartSize, uploadedBytes);
                    
                    if (bytesRead === 0) {
                        throw new errors.InternalServerError({
                            message: tpl(messages.multipartUploadReadFailed)
                        });
                    }

                    const uploadPartResponse = await this.client.send(new UploadPartCommand({
                        Bucket: this.bucket,
                        Key: key,
                        UploadId: uploadId,
                        PartNumber: partNumber,
                        Body: buffer.slice(0, bytesRead)
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

                    uploadedBytes += bytesRead;
                    partNumber += 1;

                    const progress = Math.round((uploadedBytes / fileSize) * 100);
                    logging.info(`Uploaded part ${partNumber - 1}/${Math.ceil(fileSize / this.partSize)} (${progress}%)`);
                }
            } finally {
                await fileHandle.close();
            }

            await this.client.send(new CompleteMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: parts
                }
            }));

            logging.info(`Multipart upload completed: ${parts.length} parts`);
            return `${this.cdnUrl}/${key}`;
        } catch (error) {
            if (uploadId) {
                logging.warn(`Aborting multipart upload ${uploadId}...`);
                try {
                    await this.client.send(new AbortMultipartUploadCommand({
                        Bucket: this.bucket,
                        Key: key,
                        UploadId: uploadId
                    }));
                } catch (abortError) {
                    logging.error('Failed to abort multipart upload:', abortError);
                }
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
