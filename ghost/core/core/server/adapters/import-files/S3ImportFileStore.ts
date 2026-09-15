import type { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { z } from 'zod';
import errors, { utils as errorUtils } from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import {
  ImportFileStoreBase,
  assertValidKey,
  importFileNotFoundError,
  type PutOptions,
  type StoredFile,
} from '@tryghost/adapter-base-import-files';

import { uploadMultipart } from '../lib/s3-multipart';

const MIB = 1024 * 1024;
// Minimum part size for multipart uploads, required by S3 and GCS.
const MIN_MULTIPART_CHUNK_SIZE = 5 * MIB;
const DEFAULT_MULTIPART_BYTES = 16 * MIB;
const DEFAULT_PATH_PREFIX = 'imports';

const messages = {
  missingBucket: 'S3ImportFileStore requires a bucket name',
  partialCredentials:
    'S3ImportFileStore requires both accessKeyId and secretAccessKey when either is provided',
  multipartThresholdNotInteger:
    'S3ImportFileStore multipartUploadThresholdBytes must be an integer',
  multipartChunkSizeNotInteger: 'S3ImportFileStore multipartChunkSizeBytes must be an integer',
  multipartChunkSizeTooSmall:
    'S3ImportFileStore multipartChunkSizeBytes must be at least 5 MiB (5242880 bytes)',
  refusedPrefix:
    'S3ImportFileStore object prefix "{prefix}" falls under the refused prefix "{refused}"',
  missingContentLength: 'S3ImportFileStore.put requires contentLength for a stream body.',
  lengthMismatch:
    'S3ImportFileStore.put received {received} bytes but contentLength was {expected}.',
  lengthExceeded:
    'S3ImportFileStore.put received more than the declared contentLength of {expected}.',
  invalidClient: 'S3ImportFileStore s3Client must be an S3 client with a send method.',
  missingResponseBody: 'S3 GetObject returned no readable body',
  missingContentLengthHeader: 'S3 HeadObject returned no content length',
  requestFailed: 'Something went wrong, please try again.',
};

const stripSlashes = (value = '') => value.replace(/^\/+|\/+$/g, '');

const objectPrefixOf = (pathPrefix: string | undefined, tenantPrefix: string | undefined) =>
  [stripSlashes(pathPrefix ?? DEFAULT_PATH_PREFIX), stripSlashes(tenantPrefix)]
    .filter(Boolean)
    .join('/');

const configSchema = z
  .object({
    bucket: z
      .string({ error: tpl(messages.missingBucket) })
      .min(1, { error: tpl(messages.missingBucket) }),
    // Undefined means the default; an empty string means no path prefix at all.
    pathPrefix: z.string().optional(),
    tenantPrefix: z.string().optional(),
    region: z.string().optional(),
    endpoint: z.string().optional(),
    forcePathStyle: z.boolean().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    sessionToken: z.string().optional(),
    multipartUploadThresholdBytes: z
      .number()
      .int({ error: tpl(messages.multipartThresholdNotInteger) })
      .positive()
      .optional(),
    multipartChunkSizeBytes: z
      .number()
      .int({ error: tpl(messages.multipartChunkSizeNotInteger) })
      .min(MIN_MULTIPART_CHUNK_SIZE, { error: tpl(messages.multipartChunkSizeTooSmall) })
      .optional(),
    // Prefixes this store must never write under. Ghost(Pro) sets the CDN-served
    // prefix here so a misconfiguration cannot make import files reachable by URL;
    // the rule is the operator's, so it lives in config rather than in this code.
    refusePrefixes: z.array(z.string()).optional(),
  })
  .refine(
    (config) => {
      const hasAccessKey = Boolean(config.accessKeyId);
      const hasSecretKey = Boolean(config.secretAccessKey);
      const hasSessionToken = Boolean(config.sessionToken);
      const hasCredentialPair = hasAccessKey && hasSecretKey;
      return !((hasAccessKey || hasSecretKey || hasSessionToken) && !hasCredentialPair);
    },
    { error: tpl(messages.partialCredentials) },
  )
  .superRefine((config, ctx) => {
    const prefix = objectPrefixOf(config.pathPrefix, config.tenantPrefix);
    for (const refused of config.refusePrefixes ?? []) {
      const stripped = stripSlashes(refused);
      if (stripped && `${prefix}/`.startsWith(`${stripped}/`)) {
        ctx.addIssue({
          code: 'custom',
          message: tpl(messages.refusedPrefix, { prefix, refused }),
        });
      }
    }
  });

export type S3ImportFileStoreOptions = z.infer<typeof configSchema>;

/**
 * Import file store backed by an S3-compatible bucket (VersityGW in tests, GCS on
 * Ghost(Pro)). Objects live under `<pathPrefix>/<tenantPrefix>/<key>`, `imports/`
 * by default, so one lifecycle rule on that prefix can expire whatever an import
 * failed to delete. Small bodies go up in one request; bodies at or above the
 * multipart threshold go up in parts. Nothing is listed and nothing is served.
 */
export default class S3ImportFileStore extends ImportFileStoreBase {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly objectPrefix: string;
  private readonly multipartUploadThresholdBytes: number;
  private readonly multipartChunkSizeBytes: number;

  private static parseConfig(config: unknown): S3ImportFileStoreOptions {
    const result = configSchema.safeParse(config);
    if (!result.success) {
      throw new errors.IncorrectUsageError({
        message: [...new Set(result.error.issues.map((issue) => issue.message))].join('; '),
      });
    }
    return result.data;
  }

  /**
   * Validate the options the store would be constructed with, without creating an
   * S3 client. Called by the adapter manager at boot so misconfiguration fails early.
   */
  static validate(config: unknown): asserts config is S3ImportFileStoreOptions {
    S3ImportFileStore.parseConfig(config);
  }

  constructor(config: unknown) {
    super();

    const options = S3ImportFileStore.parseConfig(config);

    this.bucket = options.bucket;
    this.objectPrefix = objectPrefixOf(options.pathPrefix, options.tenantPrefix);
    this.multipartUploadThresholdBytes =
      options.multipartUploadThresholdBytes ?? DEFAULT_MULTIPART_BYTES;
    this.multipartChunkSizeBytes = options.multipartChunkSizeBytes ?? DEFAULT_MULTIPART_BYTES;

    const clientConfig: S3ClientConfig = {
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
    };
    if (options.accessKeyId && options.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        sessionToken: options.sessionToken,
      };
    }

    // `s3Client` is a test-only injection seam, as in the other S3 adapters. It never
    // comes from config (nconf holds static values), so it is read from the raw input
    // rather than the validated schema output; anything that is not a client is
    // refused here rather than at the first request.
    const injectedClient = (config as { s3Client?: unknown } | null | undefined)?.s3Client;
    if (injectedClient !== undefined && typeof (injectedClient as S3Client)?.send !== 'function') {
      throw new errors.IncorrectUsageError({ message: tpl(messages.invalidClient) });
    }
    this.client = (injectedClient as S3Client | undefined) ?? new S3Client(clientConfig);
  }

  async put(key: string, body: Buffer | Readable, options: PutOptions): Promise<StoredFile> {
    assertValidKey(key);
    if (!Buffer.isBuffer(body) && typeof options.contentLength !== 'number') {
      throw new errors.IncorrectUsageError({ message: tpl(messages.missingContentLength) });
    }
    const objectKey = this.objectKeyFor(key);

    try {
      if (Buffer.isBuffer(body)) {
        await this.putBuffer(objectKey, body, options.contentType);
        return { size: body.length, contentType: options.contentType };
      }

      // A small stream costs one request if it is buffered first; only a body at
      // or above the threshold is worth the three calls of an upload in parts.
      const contentLength = options.contentLength!;
      if (contentLength < this.multipartUploadThresholdBytes) {
        const buffered = await collectUpTo(body, contentLength);
        if (buffered.length !== contentLength) {
          throw new errors.IncorrectUsageError({
            message: tpl(messages.lengthMismatch, {
              received: buffered.length,
              expected: contentLength,
            }),
          });
        }
        await this.putBuffer(objectKey, buffered, options.contentType);
        return { size: buffered.length, contentType: options.contentType };
      }

      const size = await uploadMultipart({
        client: this.client,
        bucket: this.bucket,
        key: objectKey,
        body,
        contentType: options.contentType,
        partSizeBytes: this.multipartChunkSizeBytes,
        expectedBytes: contentLength,
      });
      return { size, contentType: options.contentType };
    } catch (err) {
      throw this.requestError(err);
    }
  }

  async get(key: string): Promise<Readable> {
    assertValidKey(key);

    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKeyFor(key) }),
      );
      // In Node the SDK hands back the response stream itself; anything else
      // (a browser blob, a stubbed client's mistake) cannot be piped and is refused.
      const body = response.Body as unknown as Readable | undefined;
      if (!body || typeof body.pipe !== 'function') {
        throw new errors.InternalServerError({ message: tpl(messages.missingResponseBody) });
      }
      return body;
    } catch (err) {
      if (this.isNotFound(err)) {
        throw importFileNotFoundError(key);
      }
      throw this.requestError(err);
    }
  }

  async head(key: string): Promise<StoredFile | null> {
    assertValidKey(key);

    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.objectKeyFor(key) }),
      );
      // A size is part of the contract; an object of unknown size is not reported as empty.
      if (typeof response.ContentLength !== 'number') {
        throw new errors.InternalServerError({ message: tpl(messages.missingContentLengthHeader) });
      }
      return {
        size: response.ContentLength,
        contentType: response.ContentType ?? 'application/octet-stream',
      };
    } catch (err) {
      if (this.isNotFound(err)) {
        return null;
      }
      throw this.requestError(err);
    }
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);

    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: this.objectKeyFor(key) }),
      );
    } catch (err) {
      if (this.isNotFound(err)) {
        return;
      }
      // A refused delete (the credential lacks the grant yet) is a failure like any
      // other: the import reports it without failing, and the bucket lifecycle rule
      // removes the object. Claiming success here would hide retained data.
      if (this.isAccessDenied(err)) {
        logging.warn(
          { event: { name: 'import-files.delete_denied' }, key },
          'The bucket refused to delete an import file; its lifecycle rule will remove it',
        );
      }
      throw this.requestError(err);
    }
  }

  private objectKeyFor(key: string): string {
    return [this.objectPrefix, key].filter(Boolean).join('/');
  }

  private async putBuffer(objectKey: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
      }),
    );
  }

  private isNotFound(err: unknown): boolean {
    return err instanceof NotFound || err instanceof NoSuchKey;
  }

  private isAccessDenied(err: unknown): boolean {
    const candidate = err as { name?: unknown; $metadata?: { httpStatusCode?: number } } | null;
    return candidate?.name === 'AccessDenied' || candidate?.$metadata?.httpStatusCode === 403;
  }

  // Ghost's own errors are already safe to render; anything else is replaced with
  // a generic message so a bucket name or an SDK detail never reaches a user, and
  // the original is kept on the stack for operators.
  private requestError(err: unknown): Error {
    if (err instanceof Error && errorUtils.isGhostError(err)) {
      return err;
    }

    const requestError = new errors.InternalServerError({
      message: tpl(messages.requestFailed),
    });

    if (typeof (err as { stack?: string })?.stack === 'string') {
      requestError.stack = `${requestError.stack}\n\nCaused by: ${(err as { stack: string }).stack}`;
    }

    return requestError;
  }
}

// Buffer a stream that declared a small length, and stop as soon as it sends more
// than declared rather than let a lying stream fill memory.
async function collectUpTo(stream: Readable, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > limit) {
      stream.destroy();
      throw new errors.IncorrectUsageError({
        message: tpl(messages.lengthExceeded, { expected: limit }),
      });
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}
