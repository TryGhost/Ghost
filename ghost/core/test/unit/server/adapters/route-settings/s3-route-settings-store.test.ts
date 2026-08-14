import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import {
    CopyObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    NoSuchKey,
    NotFound,
    PutObjectCommand,
    type S3Client
} from '@aws-sdk/client-s3';

import {RouteSettingsStoreBase} from '@tryghost/adapter-base-route-settings';

import S3RouteSettingsStore from '../../../../../core/server/adapters/route-settings/S3RouteSettingsStore';
import parseYaml from '../../../../../core/server/services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';

const REAL_DEFAULTS_PATH = path.join(__dirname, '../../../../../core/server/services/route-settings');
const CANONICAL_KEY = 'content/settings/routes.yaml';
const CONTENT_TYPE = 'application/yaml; charset=utf-8';

const SAMPLE_YAML = `# Custom routing for the site
routes:
  /about/: about

taxonomies:
  tag: /tag/{slug}/
`;

const validConfig = {
    bucket: 'a-bucket',
    staticFileURLPrefix: 'content/settings',
    defaultSettingsBasePath: '/var/lib/ghost/content/settings'
};

const fromYaml = (yaml: string) => parseRouteSettings(parseYaml(yaml), yaml);

type StubbedClient = Pick<S3Client, 'send'>;
type S3Command = GetObjectCommand | HeadObjectCommand | CopyObjectCommand | PutObjectCommand;

const createNotFound = () => new NotFound({$metadata: {httpStatusCode: 404}, message: 'Not Found'});
const createNoSuchKey = () => new NoSuchKey({$metadata: {httpStatusCode: 404}, message: 'The specified key does not exist.'});

const stubbedClient = (sendImpl: (command: S3Command) => Promise<unknown>): S3Client => {
    const client: StubbedClient = {send: sinon.stub().callsFake(sendImpl)};
    return client as S3Client;
};

// A minimal in-memory S3 double covering the four commands the store issues, so
// the read/write/backup behaviour runs without a live bucket.
const createFakeS3 = (seed: Record<string, string> = {}) => {
    const objects = new Map<string, string>(Object.entries(seed));
    const sent: S3Command[] = [];
    const client = stubbedClient(async (command) => {
        sent.push(command);
        // Real S3 throws NoSuchKey from GetObject but NotFound from HeadObject on
        // a missing key; both must be recognised by the store's _isNotFound.
        if (command instanceof GetObjectCommand) {
            const key = command.input.Key ?? '';
            if (!objects.has(key)) {
                throw createNoSuchKey();
            }
            const body = objects.get(key)!;
            return {Body: {transformToString: async () => body}};
        }
        if (command instanceof HeadObjectCommand) {
            if (!objects.has(command.input.Key ?? '')) {
                throw createNotFound();
            }
            return {};
        }
        if (command instanceof CopyObjectCommand) {
            const source = (command.input.CopySource ?? '').split('/').slice(1).join('/');
            objects.set(command.input.Key ?? '', objects.get(source) ?? '');
            return {};
        }
        if (command instanceof PutObjectCommand) {
            objects.set(command.input.Key ?? '', command.input.Body as string);
            return {};
        }
        throw new Error('unexpected command issued to the S3 double');
    });
    return {objects, sent, client};
};

const putCommands = (sent: S3Command[]): PutObjectCommand[] => sent.filter((c): c is PutObjectCommand => c instanceof PutObjectCommand);
const copyCommands = (sent: S3Command[]): CopyObjectCommand[] => sent.filter((c): c is CopyObjectCommand => c instanceof CopyObjectCommand);

describe('UNIT: S3RouteSettingsStore', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('adapter contract', function () {
        it('extends RouteSettingsStoreBase and declares get/replace as required', function () {
            const store = new S3RouteSettingsStore(validConfig);

            assert.ok(store instanceof RouteSettingsStoreBase);
            assert.deepEqual([...store.requiredFns], ['get', 'replace']);
        });
    });

    describe('constructor validation', function () {
        it('throws when no bucket is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({staticFileURLPrefix: 'content/settings', defaultSettingsBasePath: '/x'} as never),
                {errorType: 'IncorrectUsageError', message: /bucket/}
            );
        });

        it('throws when no staticFileURLPrefix is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({bucket: 'x', defaultSettingsBasePath: '/x'} as never),
                {errorType: 'IncorrectUsageError', message: /staticFileURLPrefix/}
            );
        });

        it('throws when no defaultSettingsBasePath is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({bucket: 'x', staticFileURLPrefix: 'content/settings'} as never),
                {errorType: 'IncorrectUsageError', message: /defaultSettingsBasePath/}
            );
        });

        it('throws when only accessKeyId is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({...validConfig, accessKeyId: 'AKIA'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when only secretAccessKey is provided', function () {
            assert.throws(
                () => new S3RouteSettingsStore({...validConfig, secretAccessKey: 'shh'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when sessionToken is provided without the credential pair', function () {
            assert.throws(
                () => new S3RouteSettingsStore({...validConfig, sessionToken: 'session'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('accepts a tenantPrefix without throwing', function () {
            assert.doesNotThrow(() => new S3RouteSettingsStore({...validConfig, tenantPrefix: 'tenant-abc'}));
        });

        it('accepts a complete credential pair without throwing', function () {
            assert.doesNotThrow(() => new S3RouteSettingsStore({...validConfig, accessKeyId: 'AKIA', secretAccessKey: 'shh'}));
        });
    });

    describe('validate', function () {
        it('narrows valid options without throwing', function () {
            assert.doesNotThrow(() => S3RouteSettingsStore.validate(validConfig));
        });

        it('throws IncorrectUsageError for invalid options', function () {
            assert.throws(
                () => S3RouteSettingsStore.validate({staticFileURLPrefix: 'content/settings', defaultSettingsBasePath: '/x'}),
                {errorType: 'IncorrectUsageError'}
            );
        });
    });

    // Behavioural coverage with an injected in-memory S3 double, so the store's
    // read/write/backup logic is exercised without a live MinIO bucket (the
    // integration suite covers the same guarantees end-to-end against MinIO).
    describe('behaviour (stubbed S3 client)', function () {
        const createStore = (client: S3Client, overrides: Record<string, unknown> = {}) => new S3RouteSettingsStore({
            ...validConfig,
            defaultSettingsBasePath: REAL_DEFAULTS_PATH,
            s3Client: client,
            ...overrides
        });

        describe('replace', function () {
            it('writes yamlSource verbatim with the migration content-type at the canonical key', async function () {
                const fake = createFakeS3();

                await createStore(fake.client).replace(fromYaml(SAMPLE_YAML));

                const puts = putCommands(fake.sent);
                assert.equal(puts.length, 1);
                assert.equal(puts[0].input.Key, CANONICAL_KEY);
                assert.equal(puts[0].input.Body, SAMPLE_YAML);
                assert.equal(puts[0].input.ContentType, CONTENT_TYPE);
            });

            it('writes under the tenant prefix when configured', async function () {
                const fake = createFakeS3();

                await createStore(fake.client, {tenantPrefix: 'tenant-abc'}).replace(fromYaml(SAMPLE_YAML));

                assert.equal(putCommands(fake.sent)[0].input.Key, `tenant-abc/${CANONICAL_KEY}`);
            });

            it('copies the existing object to a backup before overwriting it', async function () {
                const fake = createFakeS3({[CANONICAL_KEY]: SAMPLE_YAML});

                await createStore(fake.client).replace(fromYaml('routes:\n  /new/: new\n'));

                const copies = copyCommands(fake.sent);
                assert.equal(copies.length, 1);
                assert.match(copies[0].input.Key ?? '', /^content\/settings\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.yaml$/);
                assert.equal(copies[0].input.CopySource, `a-bucket/${CANONICAL_KEY}`);
                // Backup must precede the overwrite, and must hold the prior bytes.
                assert.ok(fake.sent.indexOf(copies[0]) < fake.sent.indexOf(putCommands(fake.sent)[0]));
                assert.equal(fake.objects.get(copies[0].input.Key ?? ''), SAMPLE_YAML);
            });

            it('does not create a backup when no object exists yet', async function () {
                const fake = createFakeS3();

                await createStore(fake.client).replace(fromYaml(SAMPLE_YAML));

                assert.equal(copyCommands(fake.sent).length, 0);
            });

            it('propagates a non-NotFound existence-check error and does not overwrite', async function () {
                const sent: S3Command[] = [];
                const client = stubbedClient(async (command) => {
                    sent.push(command);
                    if (command instanceof HeadObjectCommand) {
                        throw new Error('access denied');
                    }
                    return {};
                });

                await assert.rejects(createStore(client).replace(fromYaml(SAMPLE_YAML)), /access denied/);
                assert.equal(putCommands(sent).length, 0);
            });
        });

        describe('get', function () {
            it('returns the parsed model and verbatim yamlSource from the stored object', async function () {
                const fake = createFakeS3({[CANONICAL_KEY]: SAMPLE_YAML});

                const settings = await createStore(fake.client).get();

                assert.equal(settings.yamlSource, SAMPLE_YAML);
                assert.deepEqual(settings.routes, [{type: 'template', path: '/about/', templates: ['about']}]);
            });

            it('returns parsed bundled defaults when no object exists', async function () {
                const fake = createFakeS3();
                const defaultYaml = await fs.readFile(path.join(REAL_DEFAULTS_PATH, 'default-routes.yaml'), 'utf8');

                const settings = await createStore(fake.client).get();

                assert.deepEqual(settings, fromYaml(defaultYaml));
            });

            it('throws YAML_PARSER_ERROR for corrupt YAML in the object', async function () {
                const fake = createFakeS3({[CANONICAL_KEY]: 'routes:\n\t- broken'});

                await assert.rejects(createStore(fake.client).get(), (err: {code?: string}) => {
                    assert.equal(err.code, 'YAML_PARSER_ERROR');
                    return true;
                });
            });

            it('throws ValidationError for structurally invalid settings', async function () {
                const fake = createFakeS3({[CANONICAL_KEY]: 'routes:\n  no-slashes: about\n'});

                await assert.rejects(createStore(fake.client).get(), (err: {errorType?: string}) => {
                    assert.equal(err.errorType, 'ValidationError');
                    return true;
                });
            });

            it('throws InternalServerError when the S3 response has no body', async function () {
                const client = stubbedClient(async () => ({Body: undefined}));

                await assert.rejects(createStore(client).get(), (err: {errorType?: string}) => {
                    assert.equal(err.errorType, 'InternalServerError');
                    return true;
                });
            });

            it('propagates non-NotFound S3 errors instead of falling back to defaults', async function () {
                const client = stubbedClient(async () => {
                    throw new Error('AccessDenied');
                });

                await assert.rejects(createStore(client).get(), /AccessDenied/);
            });
        });
    });
});
