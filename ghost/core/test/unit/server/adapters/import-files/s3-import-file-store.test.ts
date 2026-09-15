import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import logging from '@tryghost/logging';
import { ImportFileStoreBase, isImportFileNotFound } from '@tryghost/adapter-base-import-files';

import S3ImportFileStore from '../../../../../core/server/adapters/import-files/S3ImportFileStore';

const MIB = 1024 * 1024;

async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function fakeClient(send = sinon.stub()) {
  return { send, destroy: sinon.stub() };
}

const notFound = () => new NotFound({ message: 'Not Found', $metadata: { httpStatusCode: 404 } });
const noSuchKey = () => new NoSuchKey({ message: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
const accessDenied = () =>
  Object.assign(new Error('Access Denied'), {
    name: 'AccessDenied',
    $metadata: { httpStatusCode: 403 },
  });

function createStore(overrides: Record<string, unknown> = {}, client = fakeClient()) {
  return {
    store: new S3ImportFileStore({
      bucket: 'imports-bucket',
      tenantPrefix: 'site-uuid',
      s3Client: client,
      ...overrides,
    }),
    send: client.send,
  };
}

describe('S3ImportFileStore', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('config', function () {
    it('extends ImportFileStoreBase and declares the four required methods', function () {
      const { store } = createStore();

      assert.ok(store instanceof ImportFileStoreBase);
      assert.deepEqual([...store.requiredFns], ['put', 'get', 'head', 'delete']);
    });

    it('refuses an injected client that cannot send', function () {
      assert.throws(
        () => new S3ImportFileStore({ bucket: 'b', s3Client: { notAClient: true } }),
        /s3Client must be an S3 client/,
      );
      assert.throws(() => new S3ImportFileStore({ bucket: 'b', s3Client: 'x' }), /s3Client/);
    });

    it('requires a bucket', function () {
      assert.throws(() => S3ImportFileStore.validate({}), /requires a bucket name/);
      assert.throws(() => new S3ImportFileStore({ bucket: '' }), /requires a bucket name/);
    });

    it('builds its own client from a credential pair when none is injected', function () {
      const store = new S3ImportFileStore({
        bucket: 'b',
        region: 'us-east-1',
        endpoint: 'http://127.0.0.1:9000',
        forcePathStyle: true,
        accessKeyId: 'a',
        secretAccessKey: 's',
      });

      assert.ok(store instanceof ImportFileStoreBase);
    });

    it('requires both halves of a credential pair when either is given', function () {
      assert.throws(
        () => S3ImportFileStore.validate({ bucket: 'b', accessKeyId: 'only-one' }),
        /both accessKeyId and secretAccessKey/,
      );
      assert.doesNotThrow(() =>
        S3ImportFileStore.validate({ bucket: 'b', accessKeyId: 'a', secretAccessKey: 's' }),
      );
    });

    it('refuses multipart parts under the 5 MiB S3 minimum and non-integer sizes', function () {
      assert.throws(
        () => S3ImportFileStore.validate({ bucket: 'b', multipartChunkSizeBytes: 4 * MIB }),
        /at least 5 MiB/,
      );
      assert.throws(
        () => S3ImportFileStore.validate({ bucket: 'b', multipartUploadThresholdBytes: 1.5 }),
        /must be an integer/,
      );
    });

    it('refuses an object prefix that a refused prefix covers, so the CDN-served area cannot be chosen by mistake', function () {
      assert.throws(
        () =>
          S3ImportFileStore.validate({
            bucket: 'b',
            pathPrefix: '',
            tenantPrefix: 'c/ab/cd/site-uuid',
            refusePrefixes: ['c/'],
          }),
        /refused prefix "c\//,
      );
      assert.doesNotThrow(() =>
        S3ImportFileStore.validate({
          bucket: 'b',
          tenantPrefix: 'c/ab/cd/site-uuid',
          refusePrefixes: ['c/'],
        }),
      );
    });
  });

  describe('keys', function () {
    it('stores under <pathPrefix>/<tenantPrefix>/<key>, with imports as the default path prefix', async function () {
      const { store, send } = createStore();
      send.resolves({});

      await store.put('members-import/run1/rows.ndjson', Buffer.from('{}\n'), {
        contentType: 'application/x-ndjson',
      });

      const command = send.firstCall.args[0];
      assert.ok(command instanceof PutObjectCommand);
      assert.equal(command.input.Bucket, 'imports-bucket');
      assert.equal(command.input.Key, 'imports/site-uuid/members-import/run1/rows.ndjson');
    });

    it('strips surrounding slashes from the configured prefixes and allows an empty tenant', async function () {
      const { store, send } = createStore({
        pathPrefix: '/staged-imports/',
        tenantPrefix: undefined,
      });
      send.resolves({});

      await store.put('a/b/c.csv', Buffer.from('x'), { contentType: 'text/csv' });

      assert.equal(send.firstCall.args[0].input.Key, 'staged-imports/a/b/c.csv');
    });

    it('refuses unsafe keys before talking to the bucket', async function () {
      const { store, send } = createStore();

      await assert.rejects(store.get('../secrets'), /Invalid import file key/);
      await assert.rejects(store.head('/abs'), /Invalid import file key/);
      await assert.rejects(store.delete('a//b'), /Invalid import file key/);
      await assert.rejects(
        store.put('', Buffer.from('x'), { contentType: 'text/plain' }),
        /Invalid import file key/,
      );
      sinon.assert.notCalled(send);
    });
  });

  describe('put', function () {
    it('writes a buffer with one PutObject carrying the content type and length', async function () {
      const { store, send } = createStore();
      send.resolves({});

      const stored = await store.put('a/b/rows.ndjson', Buffer.from('{}\n'), {
        contentType: 'application/x-ndjson',
      });

      assert.deepEqual(stored, { size: 3, contentType: 'application/x-ndjson' });
      sinon.assert.calledOnce(send);
      const { input } = send.firstCall.args[0] as PutObjectCommand;
      assert.equal(input.ContentType, 'application/x-ndjson');
      assert.equal(input.ContentLength, 3);
      assert.deepEqual(input.Body, Buffer.from('{}\n'));
    });

    it('buffers a stream under the multipart threshold into one PutObject', async function () {
      const { store, send } = createStore();
      send.resolves({});

      const stored = await store.put('a/b/upload.csv', Readable.from(['title\n', 'First\n']), {
        contentType: 'text/csv',
        contentLength: 12,
      });

      assert.deepEqual(stored, { size: 12, contentType: 'text/csv' });
      sinon.assert.calledOnce(send);
      const { input } = send.firstCall.args[0] as PutObjectCommand;
      assert.equal(input.Body?.toString(), 'title\nFirst\n');
      assert.equal(input.ContentLength, 12);
    });

    it('refuses a stream shorter than its declared length before storing anything', async function () {
      const { store, send } = createStore();

      await assert.rejects(
        store.put('a/b/upload.csv', Readable.from(['short']), {
          contentType: 'text/csv',
          contentLength: 99,
        }),
        /received 5 bytes but contentLength was 99/,
      );
      sinon.assert.notCalled(send);
    });

    it('stops reading a stream that sends more than it declared before storing anything', async function () {
      const { store, send } = createStore();
      const body = new Readable({
        read() {
          this.push(Buffer.alloc(64 * 1024, 1));
        },
      });

      await assert.rejects(
        store.put('a/b/upload.csv', body, { contentType: 'text/csv', contentLength: 100 }),
        /more than the declared contentLength of 100/,
      );

      assert.equal(body.destroyed, true);
      sinon.assert.notCalled(send);
    });

    it('aborts a multipart upload whose stream ends short of its declared length', async function () {
      const { store, send } = createStore({
        multipartUploadThresholdBytes: 5 * MIB,
        multipartChunkSizeBytes: 5 * MIB,
      });
      sinon.stub(logging, 'warn');
      send.callsFake(async (command: unknown) => {
        if (command instanceof CreateMultipartUploadCommand) {
          return { UploadId: 'upload-1' };
        }
        if (command instanceof UploadPartCommand) {
          return { ETag: 'etag' };
        }
        return {};
      });

      await assert.rejects(
        store.put('a/b/upload.zip', Readable.from([Buffer.alloc(5 * MIB)]), {
          contentType: 'application/zip',
          contentLength: 6 * MIB,
        }),
        /sent 5242880 bytes but 6291456 were declared/,
      );

      const commands = send.getCalls().map((call) => call.args[0]);
      assert.ok(commands.at(-1) instanceof AbortMultipartUploadCommand);
      assert.equal(
        commands.some((c) => c instanceof CompleteMultipartUploadCommand),
        false,
      );
    });

    it('refuses a stream that does not declare its length without touching the bucket', async function () {
      const { store, send } = createStore();

      await assert.rejects(
        store.put('a/b/upload.csv', Readable.from(['x']), { contentType: 'text/csv' }),
        /contentLength/,
      );
      sinon.assert.notCalled(send);
    });

    it('uploads a stream at or above the threshold in parts and completes the upload', async function () {
      const { store, send } = createStore({
        multipartUploadThresholdBytes: 5 * MIB,
        multipartChunkSizeBytes: 5 * MIB,
      });
      const bytes = Buffer.alloc(5 * MIB + 10, 7);
      send.callsFake(async (command: unknown) => {
        if (command instanceof CreateMultipartUploadCommand) {
          return { UploadId: 'upload-1' };
        }
        if (command instanceof UploadPartCommand) {
          return { ETag: `etag-${command.input.PartNumber}` };
        }
        return {};
      });

      const stored = await store.put('a/b/upload.zip', Readable.from([bytes]), {
        contentType: 'application/zip',
        contentLength: bytes.length,
      });

      assert.deepEqual(stored, { size: bytes.length, contentType: 'application/zip' });
      const commands = send.getCalls().map((call) => call.args[0]);
      assert.ok(commands[0] instanceof CreateMultipartUploadCommand);
      assert.equal(commands[0].input.ContentType, 'application/zip');
      assert.equal(commands[0].input.Key, 'imports/site-uuid/a/b/upload.zip');
      const parts = commands.filter((c) => c instanceof UploadPartCommand) as UploadPartCommand[];
      assert.deepEqual(
        parts.map((c) => [c.input.PartNumber, (c.input.Body as Buffer).length]),
        [
          [1, 5 * MIB],
          [2, 10],
        ],
      );
      assert.equal(parts[0].input.UploadId, 'upload-1');
      const complete = commands.at(-1) as CompleteMultipartUploadCommand;
      assert.ok(complete instanceof CompleteMultipartUploadCommand);
      assert.deepEqual(complete.input.MultipartUpload?.Parts, [
        { ETag: 'etag-1', PartNumber: 1 },
        { ETag: 'etag-2', PartNumber: 2 },
      ]);
    });

    it('aborts a multipart upload when a part fails and rethrows', async function () {
      const { store, send } = createStore({
        multipartUploadThresholdBytes: 5 * MIB,
        multipartChunkSizeBytes: 5 * MIB,
      });
      sinon.stub(logging, 'warn');
      const bytes = Buffer.alloc(5 * MIB + 1, 1);
      send.callsFake(async (command: unknown) => {
        if (command instanceof CreateMultipartUploadCommand) {
          return { UploadId: 'upload-1' };
        }
        if (command instanceof UploadPartCommand) {
          if (command.input.PartNumber === 2) {
            throw new Error('part 2 failed');
          }
          return { ETag: 'etag-1' };
        }
        return {};
      });

      await assert.rejects(
        store.put('a/b/upload.zip', Readable.from([bytes]), {
          contentType: 'application/zip',
          contentLength: bytes.length,
        }),
        /Something went wrong/,
      );

      const abort = send
        .getCalls()
        .map((call) => call.args[0])
        .at(-1);
      assert.ok(abort instanceof AbortMultipartUploadCommand);
      assert.equal(abort.input.UploadId, 'upload-1');
      const completed = send
        .getCalls()
        .some((call) => call.args[0] instanceof CompleteMultipartUploadCommand);
      assert.equal(completed, false);
    });

    it('wraps a bucket failure so the bucket name never reaches a user', async function () {
      const { store, send } = createStore();
      send.rejects(new Error('imports-bucket exploded'));

      await assert.rejects(
        store.put('a/b/c.txt', Buffer.from('x'), { contentType: 'text/plain' }),
        (err: Error & { errorType?: string }) => {
          assert.equal(err.errorType, 'InternalServerError');
          assert.doesNotMatch(err.message, /imports-bucket/);
          assert.match(err.stack ?? '', /imports-bucket exploded/);
          return true;
        },
      );
    });
  });

  describe('get', function () {
    it('returns the object body as a stream', async function () {
      const { store, send } = createStore();
      send.resolves({ Body: Readable.from([Buffer.from('{"email":"a@example.com"}\n')]) });

      const body = await store.get('members-import/run1/rows.ndjson');

      assert.equal((await collect(body)).toString('utf8'), '{"email":"a@example.com"}\n');
      const command = send.firstCall.args[0];
      assert.ok(command instanceof GetObjectCommand);
      assert.equal(command.input.Key, 'imports/site-uuid/members-import/run1/rows.ndjson');
    });

    it('rejects a missing object with the not-found error', async function () {
      for (const missing of [notFound(), noSuchKey()]) {
        const { store, send } = createStore();
        send.rejects(missing);

        await assert.rejects(store.get('a/b/c'), (err: unknown) => isImportFileNotFound(err));
      }
    });

    it('rejects a missing or non-stream response body as a server error', async function () {
      const empty = createStore();
      empty.send.resolves({});
      await assert.rejects(empty.store.get('a/b/c'), /returned no readable body/);

      const blob = createStore();
      blob.send.resolves({ Body: { transformToString: async () => 'not a stream' } });
      await assert.rejects(blob.store.get('a/b/c'), /returned no readable body/);
    });

    it('wraps any other failure', async function () {
      const { store, send } = createStore();
      send.rejects(new Error('socket hang up'));

      await assert.rejects(store.get('a/b/c'), /Something went wrong/);
    });
  });

  describe('head', function () {
    it('returns the size and content type', async function () {
      const { store, send } = createStore();
      send.resolves({ ContentLength: 26, ContentType: 'application/x-ndjson' });

      assert.deepEqual(await store.head('a/b/rows.ndjson'), {
        size: 26,
        contentType: 'application/x-ndjson',
      });
      assert.ok(send.firstCall.args[0] instanceof HeadObjectCommand);
    });

    it('rejects an object whose size the bucket did not report rather than calling it empty', async function () {
      const { store, send } = createStore();
      send.resolves({ ContentType: 'text/csv' });

      await assert.rejects(store.head('a/b/c.csv'), /returned no content length/);
    });

    it('returns null for a missing object and wraps any other failure', async function () {
      const missing = createStore();
      missing.send.rejects(notFound());
      assert.equal(await missing.store.head('a/b/c'), null);

      const broken = createStore();
      broken.send.rejects(new Error('socket hang up'));
      await assert.rejects(broken.store.head('a/b/c'), /Something went wrong/);
    });
  });

  describe('delete', function () {
    it('deletes the object', async function () {
      const { store, send } = createStore();
      send.resolves({});

      await store.delete('a/b/c.txt');

      const command = send.firstCall.args[0];
      assert.ok(command instanceof DeleteObjectCommand);
      assert.equal(command.input.Key, 'imports/site-uuid/a/b/c.txt');
    });

    it('treats a missing object as already deleted', async function () {
      const { store, send } = createStore();
      send.rejects(noSuchKey());

      await store.delete('a/b/c.txt');
    });

    it('reports a refused delete as a failure, with a log line, rather than as success', async function () {
      const { store, send } = createStore();
      const warn = sinon.stub(logging, 'warn');
      send.rejects(accessDenied());

      await assert.rejects(store.delete('a/b/c.txt'), (err: Error & { errorType?: string }) => {
        assert.equal(err.errorType, 'InternalServerError');
        assert.doesNotMatch(err.message, /imports-bucket/);
        return true;
      });

      sinon.assert.calledOnce(warn);
      const [details] = warn.firstCall.args as [{ event: { name: string }; key: string }];
      assert.deepEqual(details.event, { name: 'import-files.delete_denied' });
      assert.equal(details.key, 'a/b/c.txt');
    });

    it('wraps any other failure', async function () {
      const { store, send } = createStore();
      send.rejects(new Error('socket hang up'));

      await assert.rejects(store.delete('a/b/c.txt'), /Something went wrong/);
    });
  });
});
