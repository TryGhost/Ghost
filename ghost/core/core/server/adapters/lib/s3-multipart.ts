import type { Readable } from 'node:stream';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';

const messages = {
  multipartUploadInitFailed: 'Failed to initiate file upload.',
  multipartUploadPartFailed: 'Failed to upload file part {partNumber}.',
  lengthMismatch: 'Multipart upload sent {sent} bytes but {expected} were declared.',
};

export interface MultipartUploadOptions {
  client: S3Client;
  bucket: string;
  key: string;
  body: Readable;
  contentType?: string;
  partSizeBytes: number;
  // When given, an upload whose stream yields a different number of bytes is
  // aborted rather than completed short or long.
  expectedBytes?: number;
}

/**
 * Re-chunk whatever a stream yields into parts of exactly `chunkSize` bytes, with
 * one shorter part at the end. S3 needs every part but the last to be at least
 * 5 MiB, and a stream's own chunks are far smaller than that.
 */
export async function* chunkStream(
  source: AsyncIterable<Buffer | string>,
  chunkSize: number,
): AsyncGenerator<Buffer> {
  let buffer = Buffer.alloc(0);

  for await (const chunk of source) {
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);

    while (buffer.length >= chunkSize) {
      yield buffer.subarray(0, chunkSize);
      buffer = buffer.subarray(chunkSize);
    }
  }

  if (buffer.length > 0) {
    yield buffer;
  }
}

/**
 * Upload a stream to S3 in parts, aborting the upload if any part fails so no
 * half-finished upload is left to bill for. Returns the number of bytes sent.
 * This is the storage adapter's multipart loop generalised from a file path to
 * a stream; the storage adapter keeps its own copy until it is switched over.
 */
export async function uploadMultipart({
  client,
  bucket,
  key,
  body,
  contentType,
  partSizeBytes,
  expectedBytes,
}: MultipartUploadOptions): Promise<number> {
  const createResponse = await client.send(
    new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
  );

  const uploadId = createResponse.UploadId;
  if (!uploadId) {
    throw new errors.InternalServerError({ message: tpl(messages.multipartUploadInitFailed) });
  }

  try {
    const parts: { ETag: string; PartNumber: number }[] = [];
    let partNumber = 1;
    let bytesSent = 0;

    for await (const part of chunkStream(body, partSizeBytes)) {
      const uploadPartResponse = await client.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: part,
        }),
      );

      if (!uploadPartResponse.ETag) {
        throw new errors.InternalServerError({
          message: tpl(messages.multipartUploadPartFailed, { partNumber }),
        });
      }

      parts.push({ ETag: uploadPartResponse.ETag, PartNumber: partNumber });
      partNumber += 1;
      bytesSent += part.length;
    }

    if (expectedBytes !== undefined && bytesSent !== expectedBytes) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.lengthMismatch, { sent: bytesSent, expected: expectedBytes }),
      });
    }

    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }),
    );

    logging.info(`Multipart upload completed: file=${key} parts=${parts.length}`);
    return bytesSent;
  } catch (error) {
    logging.warn(`Aborting multipart upload: file=${key} uploadId=${uploadId}`);
    try {
      await client.send(
        new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }),
      );
    } catch (abortError) {
      logging.error(
        `Failed to abort multipart upload: file=${key} uploadId=${uploadId}`,
        abortError,
      );
    }
    throw error;
  }
}
