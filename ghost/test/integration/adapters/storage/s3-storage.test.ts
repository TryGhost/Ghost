import { describe, it, beforeAll, afterEach, afterAll } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';

import S3Storage from '../../../../core/server/adapters/storage/S3Storage';
import { createImportFileStager } from '../../../../core/server/services/content-import/import/staged-file';
import {
  createTestS3Client,
  createTestBucket,
  emptyTestBucket,
  deleteTestBucket,
  getS3Config,
  putObject,
} from '../../../utils/s3';

const STATIC_PREFIX = 'content/images';
const s3Config = getS3Config();

// read() builds the object key as [tenantPrefix/]storagePath/relativePath, so a
// test fixture must be written at that exact key for read() to find it.
const objectKey = (relativePath: string, tenantPrefix = '') =>
  [tenantPrefix, STATIC_PREFIX, relativePath].filter(Boolean).join('/');

// Skip when VersityGW is unreachable. The flag is set by the integration
// globalSetup (vitest-globalsetup-services.ts), which probes VersityGW once before
// the forks spawn. (PLA-170)
describe.skipIf(process.env.GHOST_TEST_S3_AVAILABLE !== '1')(
  'Integration: S3Storage.read',
  function () {
    let adminClient: ReturnType<typeof createTestS3Client>;
    let bucket: string;

    const createStorage = (overrides = {}) =>
      new S3Storage({
        ...s3Config,
        bucket,
        cdnUrl: `${s3Config.endpoint}/${bucket}`,
        staticFileURLPrefix: STATIC_PREFIX,
        multipartUploadThresholdBytes: 10 * 1024 * 1024,
        multipartChunkSizeBytes: 10 * 1024 * 1024,
        ...overrides,
      });

    beforeAll(async function () {
      adminClient = createTestS3Client();
      bucket = await createTestBucket(adminClient, 'test-storage');
    });

    afterEach(async function () {
      await emptyTestBucket(adminClient, bucket);
    });

    afterAll(async function () {
      await deleteTestBucket(adminClient, bucket);
    });

    it('reopens a renamed CSV source on a second worker using its S3 key', async function () {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 's3-csv-'));
      const owner = { type: 'user', id: 'staff' } as const;
      const makeWorker = () => {
        const storage = createStorage({
          tenantPrefix: 'site-a',
          staticFileURLPrefix: 'content/imports',
        });
        return createImportFileStager({
          getStorage: () => storage,
          namespace: () => 'publication',
          getDefaultOwner: async () => owner,
          downloadToTempFile: async (open) => {
            const destination = path.join(directory, 'download');
            await pipeline(await open(), fs.createWriteStream(destination));
            return { path: destination, cleanup: () => fs.remove(destination) };
          },
        });
      };
      try {
        const source = path.join(directory, 'upload');
        const csv = 'title\nA post\n';
        await fs.writeFile(source, csv);
        const prefix = 'content-csv-import/publication/run';
        await putObject(
          adminClient,
          bucket,
          'site-a/content/imports/' + prefix + '/source',
          'taken',
        );
        const file = await makeWorker().stage(
          { filePath: source, fileName: 'posts.csv' },
          'run',
          new Date(),
        );
        assert.deepEqual(file, { key: prefix + '/source-1', name: 'posts.csv' });
        await fs.remove(source);

        const worker = makeWorker();
        const download = await worker.download(file);
        assert.equal(await fs.readFile(download.path, 'utf8'), csv);
        await download.cleanup();
        await worker.remove('run', file);
        await assert.rejects(worker.download(file), { errorType: 'NotFoundError' });
      } finally {
        await fs.remove(directory);
      }
    });

    for (const bytes of [Buffer.alloc(0), Buffer.from([0, 255, 137, 1])]) {
      it(`streams ${bytes.length} stored bytes to disk in the correct tenant`, async function () {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 's3-stream-'));
        const storage = createStorage({ tenantPrefix: 'tenant-a' });
        try {
          const source = path.join(root, 'source');
          await fs.writeFile(source, bytes);
          const key = storage.urlToPath(
            await storage.save({ name: 'opaque', path: source }, storage.storagePath),
          );
          const destination = path.join(root, 'destination');
          await pipeline(
            await storage.readStream({ path: key }),
            fs.createWriteStream(destination),
          );
          assert.deepEqual(await fs.readFile(destination), bytes);
          await assert.rejects(
            createStorage({ tenantPrefix: 'tenant-b' }).readStream({ path: key }),
            { errorType: 'NotFoundError' },
          );
        } finally {
          await fs.remove(root);
        }
      });
    }
    it('rejects missing and invalid streaming paths', async function () {
      const storage = createStorage();
      await assert.rejects(storage.readStream({ path: 'missing' }), { errorType: 'NotFoundError' });
      for (const key of ['', '../outside']) {
        await assert.rejects(storage.readStream({ path: key }), {
          errorType: 'IncorrectUsageError',
        });
      }
    });

    it('reads back the raw bytes of an object written to storage', async function () {
      // Include NUL and high bytes to prove read() is binary-safe (images).
      const body = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x0a, 0x01]);
      await putObject(adminClient, bucket, objectKey('2024/06/image.jpg'), body);

      const result = await createStorage().read({ path: '2024/06/image.jpg' });

      assert.deepEqual(result, body);
    });

    it('round-trips a file referenced by its absolute storage path', async function () {
      // image dimension lookups pass the local-style /content/images/ path;
      // read() must map that back to the same key save() would have written.
      const body = Buffer.from('saved-via-adapter');
      await putObject(adminClient, bucket, objectKey('2024/06/saved.png'), body);

      const result = await createStorage().read({ path: '/content/images/2024/06/saved.png' });

      assert.deepEqual(result, body);
    });

    it('throws NotFoundError when the object is missing', async function () {
      await assert.rejects(
        () => createStorage().read({ path: '2024/06/missing.jpg' }),
        (err: Error) => {
          assert.equal((err as { errorType?: string }).errorType, 'NotFoundError');
          assert.match(err.message, /Could not read file: 2024\/06\/missing\.jpg/);
          return true;
        },
      );
    });

    it('throws IncorrectUsageError when no path is given', async function () {
      await assert.rejects(() => createStorage().read(), {
        errorType: 'IncorrectUsageError',
        message: /requires a non-empty path/,
      });
    });

    describe('tenantPrefix scoping', function () {
      const TENANT = 'tenant-abc';

      it('reads an object stored under the tenant prefix', async function () {
        const body = Buffer.from('tenant-scoped-bytes');
        await putObject(adminClient, bucket, objectKey('2024/06/image.jpg', TENANT), body);

        const result = await createStorage({ tenantPrefix: TENANT }).read({
          path: '2024/06/image.jpg',
        });

        assert.deepEqual(result, body);
      });

      it("does not read another tenant's object", async function () {
        await putObject(
          adminClient,
          bucket,
          objectKey('2024/06/image.jpg', 'tenant-other'),
          Buffer.from('other'),
        );

        await assert.rejects(
          () => createStorage({ tenantPrefix: TENANT }).read({ path: '2024/06/image.jpg' }),
          { errorType: 'NotFoundError' },
        );
      });
    });
  },
);
