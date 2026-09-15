import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import logging from '@tryghost/logging';

import { chunkStream, uploadMultipart } from '../../../../../core/server/adapters/lib/s3-multipart';

const MIB = 1024 * 1024;

async function parts(source: AsyncIterable<Buffer | string>, size: number): Promise<number[]> {
  const lengths: number[] = [];
  for await (const part of chunkStream(source, size)) {
    lengths.push(part.length);
  }
  return lengths;
}

function client(behaviour: (command: unknown) => Promise<unknown>) {
  const send = sinon.stub().callsFake(behaviour);
  return { client: { send } as unknown as S3Client, send };
}

const commandsSent = (send: sinon.SinonStub) => send.getCalls().map((call) => call.args[0]);

describe('s3-multipart', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('chunkStream', function () {
    it('re-chunks small stream chunks into parts of the requested size', async function () {
      const source = Readable.from([Buffer.alloc(3), Buffer.alloc(4), Buffer.alloc(5)]);

      assert.deepEqual(await parts(source, 5), [5, 5, 2]);
    });

    it('yields no short trailing part when the body is an exact multiple', async function () {
      const source = Readable.from([Buffer.alloc(2 * MIB), Buffer.alloc(3 * MIB)]);

      assert.deepEqual(await parts(source, 5 * MIB), [5 * MIB]);
    });

    it('accepts string chunks and yields nothing for an empty source', async function () {
      assert.deepEqual(await parts(Readable.from(['abc', 'def']), 4), [4, 2]);
      assert.deepEqual(await parts(Readable.from([]), 4), []);
    });
  });

  describe('uploadMultipart', function () {
    const upload = (c: S3Client, body: Readable, expectedBytes?: number) =>
      uploadMultipart({
        client: c,
        bucket: 'b',
        key: 'imports/site/a/b/upload.zip',
        body,
        contentType: 'application/zip',
        partSizeBytes: 4,
        expectedBytes,
      });

    it('creates, uploads every part in order, completes, and reports the bytes sent', async function () {
      const { client: c, send } = client(async (command) => {
        if (command instanceof CreateMultipartUploadCommand) {
          return { UploadId: 'u1' };
        }
        if (command instanceof UploadPartCommand) {
          return { ETag: `e${command.input.PartNumber}` };
        }
        return {};
      });
      sinon.stub(logging, 'info');

      const sent = await upload(c, Readable.from([Buffer.from('123456789')]), 9);

      assert.equal(sent, 9);
      const commands = commandsSent(send);
      assert.equal(commands[0].input.ContentType, 'application/zip');
      assert.deepEqual(
        commands.filter((x) => x instanceof UploadPartCommand).map((x) => x.input.PartNumber),
        [1, 2, 3],
      );
      const complete = commands.at(-1) as CompleteMultipartUploadCommand;
      assert.ok(complete instanceof CompleteMultipartUploadCommand);
      assert.deepEqual(complete.input.MultipartUpload?.Parts, [
        { ETag: 'e1', PartNumber: 1 },
        { ETag: 'e2', PartNumber: 2 },
        { ETag: 'e3', PartNumber: 3 },
      ]);
    });

    it('fails without an abort when the upload could not be created', async function () {
      const { client: c, send } = client(async () => ({}));

      await assert.rejects(upload(c, Readable.from(['1234'])), /Failed to initiate file upload/);

      assert.equal(
        commandsSent(send).some((x) => x instanceof AbortMultipartUploadCommand),
        false,
      );
    });

    it('aborts and does not complete when a part comes back without an ETag', async function () {
      const { client: c, send } = client(async (command) => {
        if (command instanceof CreateMultipartUploadCommand) {
          return { UploadId: 'u1' };
        }
        return {};
      });
      sinon.stub(logging, 'warn');

      await assert.rejects(upload(c, Readable.from(['1234'])), /Failed to upload file part 1/);

      const commands = commandsSent(send);
      assert.ok(commands.at(-1) instanceof AbortMultipartUploadCommand);
      assert.equal(commands.at(-1).input.UploadId, 'u1');
      assert.equal(
        commands.some((x) => x instanceof CompleteMultipartUploadCommand),
        false,
      );
    });

    it('aborts when the stream sent a different number of bytes than declared', async function () {
      const { client: c, send } = client(async (command) => {
        if (command instanceof CreateMultipartUploadCommand) {
          return { UploadId: 'u1' };
        }
        if (command instanceof UploadPartCommand) {
          return { ETag: 'e' };
        }
        return {};
      });
      sinon.stub(logging, 'warn');

      await assert.rejects(
        upload(c, Readable.from(['1234', '56']), 10),
        /sent 6 bytes but 10 were declared/,
      );

      assert.ok(commandsSent(send).at(-1) instanceof AbortMultipartUploadCommand);
    });

    it('still surfaces the part failure when the abort itself fails', async function () {
      const partError = new Error('part exploded');
      const { client: c } = client(async (command) => {
        if (command instanceof CreateMultipartUploadCommand) {
          return { UploadId: 'u1' };
        }
        if (command instanceof UploadPartCommand) {
          throw partError;
        }
        if (command instanceof AbortMultipartUploadCommand) {
          throw new Error('abort exploded');
        }
        return {};
      });
      sinon.stub(logging, 'warn');
      const error = sinon.stub(logging, 'error');

      await assert.rejects(upload(c, Readable.from(['1234'])), partError);

      sinon.assert.calledOnce(error);
      assert.match(String(error.firstCall.args[0]), /Failed to abort multipart upload/);
    });
  });
});
