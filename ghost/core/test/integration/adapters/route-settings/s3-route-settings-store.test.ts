import {describe, it, beforeAll, afterEach, afterAll} from 'vitest';
import assert from 'node:assert/strict';
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import fs from 'fs-extra';
import sinon from 'sinon';
import {GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client} from '@aws-sdk/client-s3';

import S3RouteSettingsStore from '../../../../core/server/adapters/route-settings/S3RouteSettingsStore';
import parseYaml from '../../../../core/server/services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../../../core/server/services/route-settings/route-settings-parser';
import {
    createTestS3Client,
    createTestBucket,
    emptyTestBucket,
    deleteTestBucket,
    getMinioConfig,
    getObject,
    putObject
} from '../../../utils/minio';
import {runStoreContract} from '../../../unit/server/adapters/route-settings/helpers/store-contract';

const STATIC_PREFIX = 'content/settings';
const CANONICAL_FILENAME = 'routes.yaml';
const CONTENT_TYPE = 'application/yaml; charset=utf-8';
const REAL_DEFAULTS_PATH = path.join(__dirname, '../../../../core/server/services/route-settings');

const SAMPLE_YAML = `# Custom routing for the site
routes:
  /about/: about
  /featured/:
    controller: channel
    filter: featured:true
    template: featured

collections:
  /:
    permalink: /{slug}/
    template: index

taxonomies:
  tag: /tag/{slug}/
  author: /author/{slug}/
`;

const canonicalKey = (tenantPrefix = ''): string => [tenantPrefix, STATIC_PREFIX, CANONICAL_FILENAME].filter(Boolean).join('/');

const fromYaml = (yaml: string) => parseRouteSettings(parseYaml(yaml), yaml);

const listObjectKeys = async (s3Client: S3Client, bucketName: string): Promise<string[]> => {
    const response = await s3Client.send(new ListObjectsV2Command({Bucket: bucketName}));
    return (response.Contents ?? []).map(o => o.Key ?? '').filter(Boolean);
};

const backupKeyPattern = (tenantPrefix = ''): RegExp => new RegExp(
    `^${tenantPrefix ? `${tenantPrefix}/` : ''}${STATIC_PREFIX}/routes-\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2}\\.yaml$`
);

// Skip when MinIO is unreachable. The flag is set by the integration
// globalSetup (vitest-globalsetup-services.ts), which probes MinIO once before
// the forks spawn.
describe.skipIf(process.env.GHOST_TEST_MINIO_AVAILABLE !== '1')('Integration: S3RouteSettingsStore', function () {
    let adminClient: S3Client;
    let bucket: string;
    const minioConfig = getMinioConfig();

    const createStore = (overrides: Record<string, unknown> = {}) => new S3RouteSettingsStore({
        ...minioConfig,
        bucket,
        staticFileURLPrefix: STATIC_PREFIX,
        defaultSettingsBasePath: REAL_DEFAULTS_PATH,
        ...overrides
    });

    beforeAll(async function () {
        adminClient = createTestS3Client();
        bucket = await createTestBucket(adminClient);
    });

    afterEach(async function () {
        await emptyTestBucket(adminClient, bucket);
    });

    afterAll(async function () {
        await deleteTestBucket(adminClient, bucket);
    });

    runStoreContract({
        createStore: () => createStore()
    });

    describe('get', function () {
        it('exposes the exact stored yaml, comments and all, as yamlSource', async function () {
            await putObject(adminClient, bucket, canonicalKey(), SAMPLE_YAML);

            const settings = await createStore().get();

            assert.equal(settings.yamlSource, SAMPLE_YAML);
            assert.deepEqual(settings.routes, [
                {type: 'template', path: '/about/', templates: ['about']},
                {type: 'channel', path: '/featured/', templates: ['featured'], filter: 'featured:true'}
            ]);
        });

        it('returns parsed bundled defaults without seeding the bucket when no object exists', async function () {
            const defaultYaml = await fs.readFile(path.join(REAL_DEFAULTS_PATH, 'default-routes.yaml'), 'utf8');

            const settings = await createStore().get();

            assert.deepEqual(settings, fromYaml(defaultYaml));
            assert.deepEqual(await listObjectKeys(adminClient, bucket), []);
        });

        it('throws for corrupt YAML stored in the bucket', async function () {
            await putObject(adminClient, bucket, canonicalKey(), 'routes:\n\t- broken');

            await assert.rejects(createStore().get(), (err: {code?: string}) => {
                assert.equal(err.code, 'YAML_PARSER_ERROR');
                return true;
            });
        });

        it('throws ValidationError for structurally invalid settings', async function () {
            await putObject(adminClient, bucket, canonicalKey(), 'routes:\n  no-slashes: about\n');

            await assert.rejects(createStore().get(), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'ValidationError');
                return true;
            });
        });

        it('throws InternalServerError when the bundled default file is missing on the empty state', async function () {
            const store = createStore({defaultSettingsBasePath: path.join(REAL_DEFAULTS_PATH, 'does-not-exist')});

            await assert.rejects(store.get(), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'InternalServerError');
                return true;
            });
        });
    });

    describe('replace', function () {
        it('writes the original yaml verbatim to the canonical key', async function () {
            await createStore().replace(fromYaml(SAMPLE_YAML));

            const stored = await getObject(adminClient, bucket, canonicalKey());
            assert.equal(stored?.toString('utf-8'), SAMPLE_YAML);
        });

        it('stores the object under the canonical content/settings key', async function () {
            await createStore().replace(fromYaml(SAMPLE_YAML));

            assert.deepEqual(await listObjectKeys(adminClient, bucket), [canonicalKey()]);
        });

        it('sets the migration content-type on the stored object', async function () {
            await createStore().replace(fromYaml(SAMPLE_YAML));

            const head = await adminClient.send(new HeadObjectCommand({Bucket: bucket, Key: canonicalKey()}));
            assert.equal(head.ContentType, CONTENT_TYPE);
        });
    });

    describe('tenantPrefix scoping', function () {
        it('writes the canonical key under the tenant prefix', async function () {
            await createStore({tenantPrefix: 'tenant-abc'}).replace(fromYaml(SAMPLE_YAML));

            assert.deepEqual(await listObjectKeys(adminClient, bucket), [canonicalKey('tenant-abc')]);
        });

        it('strips leading and trailing slashes from the tenant prefix', async function () {
            await createStore({tenantPrefix: '/tenant-abc/'}).replace(fromYaml(SAMPLE_YAML));

            assert.deepEqual(await listObjectKeys(adminClient, bucket), [canonicalKey('tenant-abc')]);
        });

        it('isolates tenants sharing the same bucket', async function () {
            const storeA = createStore({tenantPrefix: 'tenant-a'});
            const storeB = createStore({tenantPrefix: 'tenant-b'});

            await storeA.replace(fromYaml(SAMPLE_YAML));
            await storeB.replace(fromYaml('routes:\n  /b/: b\n'));

            assert.equal((await storeA.get()).yamlSource, SAMPLE_YAML);
            assert.deepEqual((await storeB.get()).routes, [{type: 'template', path: '/b/', templates: ['b']}]);
            assert.deepEqual(
                (await listObjectKeys(adminClient, bucket)).sort(),
                [canonicalKey('tenant-a'), canonicalKey('tenant-b')]
            );
        });
    });

    describe('replace: timestamped backups', function () {
        it('writes the canonical key without a backup when the bucket is empty', async function () {
            await createStore().replace(fromYaml(SAMPLE_YAML));

            const keys = await listObjectKeys(adminClient, bucket);
            assert.deepEqual(keys, [canonicalKey()]);
            assert.equal(keys.filter(k => backupKeyPattern().test(k)).length, 0);
        });

        it('backs up the prior contents verbatim before overwriting', async function () {
            const store = createStore();

            await store.replace(fromYaml(SAMPLE_YAML));
            await store.replace(fromYaml('routes:\n  /new/: new\n'));

            const keys = await listObjectKeys(adminClient, bucket);
            const backupKey = keys.find(k => backupKeyPattern().test(k));
            assert.ok(backupKey, `expected a timestamped backup key, got: ${keys.join(', ')}`);

            const backupBody = await getObject(adminClient, bucket, backupKey!);
            assert.equal(backupBody?.toString('utf-8'), SAMPLE_YAML);
            assert.equal((await store.get()).yamlSource, 'routes:\n  /new/: new\n');
        });

        it('creates a new backup on every overwrite', {timeout: 15000}, async function () {
            // The backup key generator uses a per-second timestamp, so real waits
            // between writes are needed to guarantee distinct backup keys.
            const store = createStore();

            await store.replace(fromYaml('routes:\n  /a/: a\n'));
            await sleep(1100);
            await store.replace(fromYaml('routes:\n  /b/: b\n'));
            await sleep(1100);
            await store.replace(fromYaml('routes:\n  /c/: c\n'));

            const keys = await listObjectKeys(adminClient, bucket);
            const backupKeys = keys.filter(k => backupKeyPattern().test(k));
            assert.equal(backupKeys.length, 2, `expected 2 timestamped backups, got: ${keys.join(', ')}`);
            assert.ok(keys.includes(canonicalKey()), `expected canonical ${canonicalKey()}, got: ${keys.join(', ')}`);
        });

        it('writes backups under the tenant prefix on overwrite', async function () {
            const store = createStore({tenantPrefix: 'tenant-abc'});

            await store.replace(fromYaml(SAMPLE_YAML));
            await store.replace(fromYaml('routes:\n  /new/: new\n'));

            const keys = await listObjectKeys(adminClient, bucket);
            const backupKey = keys.find(k => backupKeyPattern('tenant-abc').test(k));
            assert.ok(backupKey, `expected a tenant-scoped backup key, got: ${keys.join(', ')}`);

            const backupBody = await getObject(adminClient, bucket, backupKey!);
            assert.equal(backupBody?.toString('utf-8'), SAMPLE_YAML);
        });
    });
});

// Config validation and S3 fault branches are exercised without a live bucket:
// a real GetObject always returns a Body and Head/Get don't surface arbitrary
// transport errors on demand, so the error paths are driven with an injected
// failing client. This lives in the integration suite because only that
// coverage report is uploaded, and it runs regardless of MinIO.
describe('Integration: S3RouteSettingsStore without a live bucket', function () {
    afterEach(function () {
        sinon.restore();
    });

    const faultyStore = (send: (command: unknown) => Promise<unknown>) => {
        const client: Pick<S3Client, 'send'> = {send: sinon.stub().callsFake(send)};
        return new S3RouteSettingsStore({
            bucket: 'a-bucket',
            staticFileURLPrefix: STATIC_PREFIX,
            defaultSettingsBasePath: REAL_DEFAULTS_PATH,
            s3Client: client as S3Client
        });
    };

    it('throws IncorrectUsageError when constructed with invalid config', function () {
        assert.throws(
            () => new S3RouteSettingsStore({staticFileURLPrefix: STATIC_PREFIX} as never),
            {errorType: 'IncorrectUsageError'}
        );
    });

    it('validate() accepts valid options and rejects invalid ones', function () {
        assert.doesNotThrow(() => S3RouteSettingsStore.validate({
            bucket: 'a-bucket',
            staticFileURLPrefix: STATIC_PREFIX,
            defaultSettingsBasePath: REAL_DEFAULTS_PATH
        }));
        assert.throws(() => S3RouteSettingsStore.validate({} as never), {errorType: 'IncorrectUsageError'});
    });

    it('throws InternalServerError when GetObject returns no body', async function () {
        const store = faultyStore(async () => ({}));

        await assert.rejects(store.get(), (err: {errorType?: string}) => {
            assert.equal(err.errorType, 'InternalServerError');
            return true;
        });
    });

    it('propagates a non-NotFound error raised while reading', async function () {
        const store = faultyStore(async (command) => {
            if (command instanceof GetObjectCommand) {
                throw new Error('connection reset');
            }
            return {};
        });

        await assert.rejects(store.get(), /connection reset/);
    });

    it('propagates a non-NotFound error raised by the existence check on replace', async function () {
        const store = faultyStore(async (command) => {
            if (command instanceof HeadObjectCommand) {
                throw new Error('access denied');
            }
            return {};
        });

        await assert.rejects(store.replace(fromYaml(SAMPLE_YAML)), /access denied/);
    });
});
