import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'vitest';

import FileStore from '../../../../../core/server/adapters/route-settings/FileStore';
import parseYaml from '../../../../../core/server/services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import {InMemoryStore} from '../../adapters/route-settings/helpers/in-memory-store';

const DynamicRoutingService = require('../../../../../core/server/services/route-settings/dynamic-routing-service');
const SettingsLoader = require('../../../../../core/server/services/route-settings/settings-loader');
const bridge = require('../../../../../core/bridge');
const urlService = require('../../../../../core/server/services/url');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

const DEFAULT_SETTINGS_BASE_PATH = path.join(__dirname, '../../../../../core/server/services/route-settings');

const fromYaml = (yaml: string) => parseRouteSettings(parseYaml(yaml), yaml);

const CUSTOM_YAML = `routes:
  /about/: about

collections:
  /:
    permalink: /{slug}/
    template: index

taxonomies:
  tag: /tag/{slug}/
`;

describe('UNIT: DynamicRoutingService (store-backed)', function () {
    let service: InstanceType<typeof DynamicRoutingService>;
    let store: InMemoryStore;

    beforeEach(function () {
        service = new DynamicRoutingService();
        store = new InMemoryStore();
        service.configure({store});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('download returns the verbatim yaml source from the store', async function () {
        await store.replace(fromYaml(CUSTOM_YAML));

        assert.equal(await service.download(), CUSTOM_YAML);
    });

    it('loadRouteSettings expands the domain model into the router format', async function () {
        await store.replace(fromYaml(CUSTOM_YAML));

        const expanded = await service.loadRouteSettings();

        assert.deepEqual(expanded.routes['/about/'], {templates: ['about']});
        assert.equal(expanded.collections['/'].permalink, '/:slug/');
        assert.equal(expanded.taxonomies.tag, '/tag/:slug/');
    });

    it('getCurrentHash over the bundled defaults matches the known default hash', async function () {
        const defaultYaml = await fs.readFile(
            path.join(__dirname, '../../../../../core/server/services/route-settings/default-routes.yaml'),
            'utf8'
        );
        await store.replace(fromYaml(defaultYaml));

        assert.equal(await service.getCurrentHash(), service.getDefaultHash());
    });

    it('getCurrentHash matches md5 of the stringified expansion', async function () {
        await store.replace(fromYaml(CUSTOM_YAML));

        const expected = crypto.createHash('md5')
            .update(JSON.stringify(await service.loadRouteSettings()), 'binary')
            .digest('hex');

        assert.equal(await service.getCurrentHash(), expected);
    });

    describe('loadRouteSettings legacy fallback', function () {
        it('falls back to the legacy validator when the store parser rejects the file', async function () {
            const errorStub = sinon.stub(logging, 'error');
            sinon.stub(store, 'get').rejects(new errors.ValidationError({message: 'slug is required for read data entries.'}));

            const legacyResult = {routes: {'/legacy/': {templates: ['legacy']}}, collections: {}, taxonomies: {}};
            const settingsLoader = {loadSettings: sinon.stub().resolves(legacyResult)};
            service.configure({store, settingsLoader});

            const settings = await service.loadRouteSettings();

            assert.deepEqual(settings, legacyResult);
            assert.equal((settingsLoader.loadSettings as sinon.SinonStub).callCount, 1);
            assert.ok(errorStub.calledOnce);

            const reported = errorStub.firstCall.args[0];
            assert.equal(reported.code, 'ROUTE_SETTINGS_VALIDATION_FALLBACK');
            assert.equal(reported.errorDetails.reason, 'slug is required for read data entries.');
        });

        it('does not fall back for non-validation errors even with a legacy loader', async function () {
            const errorStub = sinon.stub(logging, 'error');
            sinon.stub(store, 'get').rejects(new errors.InternalServerError({message: 'Error trying to access settings files in /content/settings.'}));

            const settingsLoader = {loadSettings: sinon.stub().resolves({routes: {}, collections: {}, taxonomies: {}})};
            service.configure({store, settingsLoader});

            await assert.rejects(service.loadRouteSettings(), /Error trying to access settings files/);
            assert.equal((settingsLoader.loadSettings as sinon.SinonStub).called, false);
            assert.equal(errorStub.called, false);
        });

        it('rethrows the original error when no legacy loader is configured', async function () {
            const errorStub = sinon.stub(logging, 'error');
            const parseError = new errors.ValidationError({message: 'A trailing slash is required.'});
            sinon.stub(store, 'get').rejects(parseError);

            // Default beforeEach wiring has no settingsLoader.
            await assert.rejects(service.loadRouteSettings(), /A trailing slash is required\./);
            assert.equal(errorStub.called, false);
        });

        it('does not touch the legacy validator when the store parser succeeds', async function () {
            const errorStub = sinon.stub(logging, 'error');
            const settingsLoader = {loadSettings: sinon.stub().resolves({routes: {}, collections: {}, taxonomies: {}})};
            service.configure({store, settingsLoader});
            await store.replace(fromYaml(CUSTOM_YAML));

            const settings = await service.loadRouteSettings();

            assert.deepEqual(settings.routes['/about/'], {templates: ['about']});
            assert.equal((settingsLoader.loadSettings as sinon.SinonStub).called, false);
            assert.equal(errorStub.called, false);
        });

        it('loads a file that only the stricter parser rejects through the legacy validator', async function () {
            const errorStub = sinon.stub(logging, 'error');

            const contentDir = path.join(os.tmpdir(), `route-settings-fallback-${crypto.randomUUID()}`);
            await fs.ensureDir(contentDir);

            // A `read` data entry without a slug: accepted by the legacy
            // validator, rejected by the stricter store parser.
            const legacyValidYaml = `routes:
  /featured/:
    template: featured
    data:
      my-post:
        resource: posts
        type: read

collections:
  /:
    permalink: /{slug}/
    template: index

taxonomies:
  tag: /tag/{slug}/
`;
            const routesPath = path.join(contentDir, 'routes.yaml');
            await fs.writeFile(routesPath, legacyValidYaml, 'utf8');

            const fileStore = new FileStore({basePath: contentDir, defaultSettingsBasePath: DEFAULT_SETTINGS_BASE_PATH});
            const settingsLoader = new SettingsLoader({parseYaml, settingFilePath: routesPath});

            const fallbackService = new DynamicRoutingService();
            fallbackService.configure({store: fileStore, settingsLoader});

            try {
                const settings = await fallbackService.loadRouteSettings();

                assert.ok(settings.routes['/featured/'], 'the read route survives via the legacy validator');
                assert.equal(settings.collections['/'].permalink, '/:slug/');
                assert.ok(errorStub.calledOnce);
                assert.equal(errorStub.firstCall.args[0].code, 'ROUTE_SETTINGS_VALIDATION_FALLBACK');

                assert.equal(await fallbackService.download(), legacyValidYaml);
            } finally {
                await fs.remove(contentDir);
            }
        });
    });

    describe('get raw-file fallback', function () {
        it('returns the raw file when the stored yaml is syntactically corrupt', async function () {
            const contentDir = path.join(os.tmpdir(), `route-settings-corrupt-${crypto.randomUUID()}`);
            await fs.ensureDir(contentDir);

            const corruptYaml = 'routes:\n  bad: [unclosed\n';
            const routesPath = path.join(contentDir, 'routes.yaml');
            await fs.writeFile(routesPath, corruptYaml, 'utf8');

            const fileStore = new FileStore({basePath: contentDir, defaultSettingsBasePath: DEFAULT_SETTINGS_BASE_PATH});
            const settingsLoader = new SettingsLoader({parseYaml, settingFilePath: routesPath});

            const corruptService = new DynamicRoutingService();
            corruptService.configure({store: fileStore, settingsLoader});

            try {
                assert.equal(await corruptService.download(), corruptYaml);
            } finally {
                await fs.remove(contentDir);
            }
        });
    });

    describe('upload', function () {
        let uploadDir: string;

        const writeUpload = async (content: string): Promise<string> => {
            const filePath = path.join(uploadDir, 'routes-incoming.yaml');
            await fs.writeFile(filePath, content, 'utf8');
            return filePath;
        };

        beforeEach(async function () {
            uploadDir = path.join(os.tmpdir(), `route-settings-upload-${crypto.randomUUID()}`);
            await fs.ensureDir(uploadDir);
        });

        afterEach(async function () {
            await fs.remove(uploadDir);
        });

        it('persists the parsed upload through the store', async function () {
            sinon.stub(bridge, 'reloadFrontend').resolves();
            sinon.stub(urlService, 'resetGenerators');
            sinon.stub(urlService, 'hasFinished').returns(true);

            await service.upload(await writeUpload(CUSTOM_YAML));

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
        });

        it('rejects an invalid upload before anything reaches the store', async function () {
            const reloadStub = sinon.stub(bridge, 'reloadFrontend').resolves();
            await store.replace(fromYaml(CUSTOM_YAML));

            await assert.rejects(
                service.upload(await writeUpload('routes:\n  no-slashes: about\n')),
                (err: {errorType?: string}) => {
                    assert.equal(err.errorType, 'ValidationError');
                    return true;
                }
            );

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
            assert.equal(reloadStub.called, false);
        });

        it('accepts a valid upload when the current file is syntactically corrupt yaml', async function () {
            sinon.stub(bridge, 'reloadFrontend').resolves();
            sinon.stub(urlService, 'resetGenerators');
            sinon.stub(urlService, 'hasFinished').returns(true);

            const getStub = sinon.stub(store, 'get');
            getStub.onFirstCall().rejects(new errors.IncorrectUsageError({message: 'Could not parse provided YAML file: bad indentation of a mapping entry.'}));
            getStub.callThrough();

            await service.upload(await writeUpload(CUSTOM_YAML));

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
        });

        it('accepts a valid upload when the current file only passes the legacy validator', async function () {
            sinon.stub(bridge, 'reloadFrontend').resolves();
            sinon.stub(urlService, 'resetGenerators');
            sinon.stub(urlService, 'hasFinished').returns(true);

            const getStub = sinon.stub(store, 'get');
            getStub.onFirstCall().rejects(new errors.ValidationError({message: 'slug is required for read data entries.'}));
            getStub.callThrough();

            await service.upload(await writeUpload(CUSTOM_YAML));

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
        });

        it('surfaces a frontend reload failure without rolling back the store', async function () {
            const reloadStub = sinon.stub(bridge, 'reloadFrontend');
            reloadStub.rejects(new Error('YAMLException: bad indentation of a mapping entry'));
            sinon.stub(urlService, 'resetGenerators');

            await store.replace(fromYaml(CUSTOM_YAML));

            const nextYaml = CUSTOM_YAML.replace('/about/: about', '/contact/: contact');

            await assert.rejects(
                service.upload(await writeUpload(nextYaml)),
                /YAMLException/
            );

            assert.equal((await store.get()).yamlSource, nextYaml);
            assert.equal(reloadStub.callCount, 1);
        });
    });
});
