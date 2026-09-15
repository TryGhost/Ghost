import { describe, it, beforeAll, afterEach, afterAll } from 'vitest';
import assert from 'node:assert/strict';
import { S3Client } from '@aws-sdk/client-s3';
import { runImportFileStoreContractTests } from '@tryghost/adapter-base-import-files/contract-test-suite';

import {
  createTestS3Client,
  createTestBucket,
  emptyTestBucket,
  deleteTestBucket,
  getObject,
  getS3Config,
} from '../../../utils/s3';

const MIB = 1024 * 1024;

// The adapter-manager is required for its `.default` export and config-utils is
// untyped JS, so neither can be imported. The store class is required too, so this
// file exercises the same module instance the adapter loader resolves; an ESM
// import would load a second copy and the coverage would land on the wrong one.
const S3ImportFileStore =
  require('../../../../core/server/adapters/import-files/S3ImportFileStore').default;
const adapterManager = require('../../../../core/server/services/adapter-manager').default;
const configUtils = require('../../../utils/config-utils');

// Skip when the S3-compatible test server is unreachable. The flag is set by the
// integration globalSetup (vitest-globalsetup-services.ts), which probes it once
// before the forks spawn.
describe.skipIf(process.env.GHOST_TEST_S3_AVAILABLE !== '1')(
  'Integration: S3ImportFileStore',
  function () {
    let adminClient: S3Client;
    let bucket: string;
    const s3Config = getS3Config();

    const createStore = (overrides: Record<string, unknown> = {}) =>
      new S3ImportFileStore({
        ...s3Config,
        bucket,
        tenantPrefix: 'site-uuid',
        // The S3 minimum, so the contract's large body takes the multipart path
        // without needing tens of megabytes.
        multipartUploadThresholdBytes: 5 * MIB,
        multipartChunkSizeBytes: 5 * MIB,
        ...overrides,
      });

    beforeAll(async function () {
      adminClient = createTestS3Client();
      bucket = await createTestBucket(adminClient, 'test-import-files');
    });

    afterEach(async function () {
      await emptyTestBucket(adminClient, bucket);
      await configUtils.restore();
      adapterManager.clearCache();
    });

    afterAll(async function () {
      await deleteTestBucket(adminClient, bucket);
      adminClient.destroy();
    });

    runImportFileStoreContractTests(
      () => createStore(),
      { describe, it },
      {
        largeBodyBytes: 5 * MIB,
      },
    );

    it('places objects under imports/<tenant>/<key> so a lifecycle rule can own the whole area', async function () {
      const store = createStore();

      await store.put(
        'members-import/run1/rows.ndjson',
        Buffer.from('{"email":"a@example.com"}\n'),
        {
          contentType: 'application/x-ndjson',
        },
      );

      const written = await getObject(
        adminClient,
        bucket,
        'imports/site-uuid/members-import/run1/rows.ndjson',
      );
      assert.equal(written?.toString('utf8'), '{"email":"a@example.com"}\n');
      assert.deepEqual(await store.head('members-import/run1/rows.ndjson'), {
        size: 26,
        contentType: 'application/x-ndjson',
      });
    });

    it('keeps tenants apart', async function () {
      const first = createStore({ tenantPrefix: 'site-one' });
      const second = createStore({ tenantPrefix: 'site-two' });
      await first.put('members-import/run1/rows.ndjson', Buffer.from('one'), {
        contentType: 'text/plain',
      });

      assert.equal(await second.head('members-import/run1/rows.ndjson'), null);
      assert.equal((await first.head('members-import/run1/rows.ndjson'))?.size, 3);
    });

    it('is resolved by the adapter manager from config and round-trips a file', async function () {
      configUtils.set('adapters:import-files:active', 'S3ImportFileStore');
      configUtils.set('adapters:import-files:S3ImportFileStore', {
        ...s3Config,
        bucket,
        tenantPrefix: 'site-uuid',
      });
      adapterManager.clearCache();
      const store = adapterManager.getAdapter('import-files');
      assert.equal(store.constructor.name, 'S3ImportFileStore');

      await store.put('content-csv-import/run1/upload.csv', Buffer.from('title\nFirst\n'), {
        contentType: 'text/csv',
      });
      const written = await getObject(
        adminClient,
        bucket,
        'imports/site-uuid/content-csv-import/run1/upload.csv',
      );
      assert.equal(written?.toString('utf8'), 'title\nFirst\n');

      await store.delete('content-csv-import/run1/upload.csv');
      assert.equal(
        await getObject(
          adminClient,
          bucket,
          'imports/site-uuid/content-csv-import/run1/upload.csv',
        ),
        null,
      );
    });
  },
);
