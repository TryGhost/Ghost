import fs from 'node:fs';
import path from 'node:path';
import StorageBase from 'ghost-storage-base';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import {
    DeleteObjectCommand,
    HeadObjectCommand,
    NotFound,
    NoSuchKey,
    PutObjectCommand,
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
    readNotSupported: 'read() is not supported by S3Storage. S3Storage is designed for media and files, not images. Use LocalImagesStorage for image storage.'
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
}

export default class S3Storage extends StorageBase {
    private readonly client: S3Client;

    private readonly bucket: string;

    private readonly tenantPrefix: string;

    private readonly cdnUrl: string;

    public readonly staticFileURLPrefix: string;

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

        // Required by ImporterContentFileHandler
        this.staticFileURLPrefix = staticFileURLPrefix;

        // Required by ExternalMediaInliner
        this.storagePath = staticFileURLPrefix;

        this.cdnUrl = stripTrailingSlash(options.cdnUrl || '');
        if (!this.cdnUrl) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingCdnUrl)
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

        this.client = options.s3Client || new S3Client(clientConfig);
    }

    async save(file: UploadFile, targetDir?: string): Promise<string> {
        const dir = targetDir || this.getTargetDir();
        const relativePath = await this.getUniqueFileName(file, dir);

        const key = this.buildKey(relativePath);
        const body = fs.createReadStream(file.path);

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: file.type
        }));

        return `${this.cdnUrl}/${key}`;
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
