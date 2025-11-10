import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import StorageBase from 'ghost-storage-base';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
    S3ClientConfig,
    type GetObjectCommandOutput
} from '@aws-sdk/client-s3';

const messages = {
    notFound: 'File not found',
    notFoundWithRef: 'File not found: {file}',
    cannotRead: 'Could not read file: {file}',
    invalidUrlParameter: 'The URL "{url}" is not a valid URL for this site.'
};

const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const normalizePath = (value = '') => {
    if (!value) {
        return '';
    }

    return value
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .join('/');
};

interface UploadFile {
    name: string;
    path: string;
    type?: string;
}

export interface S3StorageOptions {
    bucket: string;
    region?: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    staticFileURLPrefix?: string;
    prefix?: string;
    cdnUrl?: string;
    s3Client?: S3Client;
}

export default class S3Storage extends StorageBase {
    private readonly client: S3Client;

    private readonly bucket: string;

    private readonly prefix: string;

    private readonly cdnUrl: string;

    constructor(options: S3StorageOptions) {
        super();

        if (!options.bucket) {
            throw new errors.IncorrectUsageError({
                message: 'S3Storage requires a bucket name'
            });
        }

        this.bucket = options.bucket;
        this.prefix = normalizePath(options.prefix || '');

        const staticFileURLPrefix = normalizePath(options.staticFileURLPrefix || '');
        if (!staticFileURLPrefix) {
            throw new errors.IncorrectUsageError({
                message: 'S3Storage requires a staticFileURLPrefix'
            });
        }

        this.storagePath = staticFileURLPrefix;
        this.cdnUrl = stripTrailingSlash(options.cdnUrl || '');
        if (!this.cdnUrl) {
            throw new errors.IncorrectUsageError({
                message: 'S3Storage requires a cdnUrl option'
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
        const dir = targetDir || this.getTargetDir(this.storagePath);
        const relativePath = await this.getUniqueFileName(file, dir);

        const key = this.buildKey(relativePath);
        const body = fs.createReadStream(file.path);

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: file.type
        }));

        return this.buildServeUrl(relativePath);
    }

    async saveRaw(buffer: Buffer, targetPath: string): Promise<string> {
        const relativePath = this.resolveRelativePath(targetPath);
        const key = this.buildKey(relativePath);

        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer
        }));

        return this.buildServeUrl(relativePath);
    }

    urlToPath(url: string): string {
        const trimmedUrl = url.trim();

        const fromCdn = this.stripBase(trimmedUrl, this.cdnUrl);
        if (fromCdn !== undefined) {
            return normalizePath(fromCdn);
        }

        throw new errors.IncorrectUsageError({
            message: tpl(messages.invalidUrlParameter, {url})
        });
    }

    async exists(fileName: string, targetDir?: string): Promise<boolean> {
        const relativePath = this.resolveRelativePath(fileName, targetDir);
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

    async delete(fileName: string, targetDir?: string): Promise<void> {
        const relativePath = this.resolveRelativePath(fileName, targetDir);
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

    async read(options?: {path: string} | string, targetDir?: string): Promise<Buffer> {
        const pathOrFile = typeof options === 'string' ? options : options?.path;
        if (!pathOrFile) {
            throw new errors.IncorrectUsageError({
                message: 'S3Storage.read requires a path'
            });
        }

        const relativePath = this.resolveRelativePath(pathOrFile, targetDir);
        const key = this.buildKey(relativePath);

        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.bucket,
                Key: key
            }));

            return await this.bodyToBuffer(response.Body);
        } catch (error) {
            if (this.isNotFound(error)) {
                throw new errors.NotFoundError({
                    message: tpl(messages.notFoundWithRef, {file: pathOrFile})
                });
            }

            throw new errors.InternalServerError({
                message: tpl(messages.cannotRead, {file: pathOrFile}),
                err: error
            });
        }
    }

    private resolveRelativePath(pathOrFile?: string, targetDir?: string): string {
        const normalizedFile = normalizePath(pathOrFile || '');

        if (targetDir) {
            const normalizedDir = normalizePath(targetDir);
            if (!normalizedDir) {
                return normalizedFile;
            }

            if (!normalizedFile) {
                return normalizedDir;
            }

            return normalizePath(path.posix.join(normalizedDir, normalizedFile));
        }

        const prefix = this.prefix;
        if (prefix && (normalizedFile === prefix || normalizedFile.startsWith(`${prefix}/`))) {
            return normalizedFile;
        }

        const storageRoot = this.storagePath;
        if (!storageRoot) {
            return normalizedFile;
        }

        if (!normalizedFile) {
            return storageRoot;
        }

        if (normalizedFile === storageRoot || normalizedFile.startsWith(`${storageRoot}/`)) {
            return normalizedFile;
        }

        return normalizePath(path.posix.join(storageRoot, normalizedFile));
    }

    private buildKey(relativePath: string): string {
        const normalizedPath = normalizePath(relativePath);

        if (!this.prefix) {
            return normalizedPath;
        }

        if (!normalizedPath) {
            return this.prefix;
        }

        if (normalizedPath === this.prefix || normalizedPath.startsWith(`${this.prefix}/`)) {
            return normalizedPath;
        }

        return `${this.prefix}/${normalizedPath}`;
    }

    private buildServeUrl(relativePath: string): string {
        const key = this.buildKey(relativePath);

        return `${this.cdnUrl}/${key}`;
    }

    private stripBase(url: string, base?: string) {
        if (!base) {
            return undefined;
        }

        if (url === base) {
            return '';
        }

        if (url.startsWith(`${base}/`)) {
            return url.slice(base.length + 1);
        }

        return undefined;
    }

    private isNotFound(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const err = error as {name?: string; $metadata?: {httpStatusCode?: number}};

        if (err.$metadata?.httpStatusCode === 404) {
            return true;
        }

        if (err.name === 'NotFound' || err.name === 'NoSuchKey') {
            return true;
        }

        return false;
    }

    private async bodyToBuffer(body: GetObjectCommandOutput['Body']): Promise<Buffer> {
        if (!body) {
            return Buffer.alloc(0);
        }

        if (Buffer.isBuffer(body)) {
            return body;
        }

        if (typeof body === 'string') {
            return Buffer.from(body);
        }

        if (body instanceof Readable) {
            return await new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = [];
                body.on('data', (chunk: Buffer | string) => {
                    if (typeof chunk === 'string') {
                        chunks.push(Buffer.from(chunk));
                    } else if (Buffer.isBuffer(chunk)) {
                        chunks.push(chunk);
                    } else {
                        chunks.push(Buffer.from(chunk));
                    }
                });
                body.once('end', () => {
                    resolve(Buffer.concat(chunks));
                });
                body.once('error', reject);
            });
        }

        if (body instanceof Uint8Array) {
            return Buffer.from(body);
        }

        const maybeStream = body as {transformToByteArray?: () => Promise<Uint8Array>; arrayBuffer?: () => Promise<ArrayBuffer>};

        if (typeof maybeStream.transformToByteArray === 'function') {
            return Buffer.from(await maybeStream.transformToByteArray());
        }

        if (typeof maybeStream.arrayBuffer === 'function') {
            return Buffer.from(await maybeStream.arrayBuffer());
        }

        throw new errors.InternalServerError({
            message: 'Unsupported body type returned from S3'
        });
    }
}
