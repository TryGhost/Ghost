import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import {afterEach, beforeEach, describe, it} from 'vitest';

import {RouteSettingsStoreBase, type RouteSettings} from '@tryghost/adapter-base-route-settings';

import FileStore from '../../../../../core/server/adapters/route-settings/FileStore';
import parseYaml from '../../../../../core/server/services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import {buildRouteSettings} from '../../services/route-settings/route-settings-fixture';

const REAL_DEFAULTS_PATH = path.join(__dirname, '../../../../../core/server/services/route-settings');

const SAMPLE_YAML = `routes:
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

const sampleSettings = (): RouteSettings => buildRouteSettings({
    routes: [{type: 'template', path: '/about/', templates: ['about']}],
    collections: [{path: '/', permalink: '/{slug}/', templates: ['index']}],
    taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
});

// Builds settings from real YAML so yamlSource carries the operator's exact
// bytes (comments, ordering, formatting) rather than a re-serialised model.
const fromYaml = (yaml: string): RouteSettings => parseRouteSettings(parseYaml(yaml), yaml);

describe('UNIT: route-settings FileStore', function () {
    let basePath: string;
    let defaultsPath: string;

    const createStore = (overrides: Partial<ConstructorParameters<typeof FileStore>[0]> = {}) => new FileStore({
        basePath,
        defaultSettingsBasePath: defaultsPath,
        ...overrides
    });

    beforeEach(async function () {
        basePath = path.join(os.tmpdir(), `route-settings-filestore-${crypto.randomUUID()}`);
        defaultsPath = path.join(os.tmpdir(), `route-settings-defaults-${crypto.randomUUID()}`);
        await fs.ensureDir(basePath);
        await fs.ensureDir(defaultsPath);
        await fs.copy(
            path.join(REAL_DEFAULTS_PATH, 'default-routes.yaml'),
            path.join(defaultsPath, 'default-routes.yaml')
        );
    });

    afterEach(async function () {
        await fs.remove(basePath);
        await fs.remove(defaultsPath);
    });

    describe('adapter contract', function () {
        it('extends RouteSettingsStoreBase and declares get/replace as required', function () {
            const store = createStore();

            assert.ok(store instanceof RouteSettingsStoreBase);
            assert.deepEqual([...store.requiredFns], ['get', 'replace']);
        });

        it('throws IncorrectUsageError when constructed without the required paths', function () {
            assert.throws(() => new FileStore({} as ConstructorParameters<typeof FileStore>[0]), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'IncorrectUsageError');
                return true;
            });
        });
    });

    describe('get', function () {
        it('parses an existing routes.yaml into the domain model', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), SAMPLE_YAML, 'utf8');

            const settings = await createStore().get();

            assert.deepEqual(settings.routes, [
                {type: 'template', path: '/about/', templates: ['about']},
                {type: 'channel', path: '/featured/', templates: ['featured'], filter: 'featured:true'}
            ]);
            assert.deepEqual(settings.collections, [
                {path: '/', permalink: '/{slug}/', templates: ['index']}
            ]);
            assert.deepEqual(settings.taxonomies, {
                tag: '/tag/{slug}/',
                author: '/author/{slug}/'
            });
        });

        it('exposes the exact original yaml, comments and all, as yamlSource', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), SAMPLE_YAML, 'utf8');

            const settings = await createStore().get();

            assert.equal(settings.yamlSource, SAMPLE_YAML);
        });

        it('returns parsed defaults without writing to disk when no canonical file exists', async function () {
            const defaultYaml = await fs.readFile(path.join(defaultsPath, 'default-routes.yaml'), 'utf8');

            const settings = await createStore().get();

            assert.deepEqual(settings, {
                routes: [],
                collections: [{path: '/', permalink: '/{slug}/', templates: ['index']}],
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'},
                yamlSource: defaultYaml
            });

            // The empty state stays empty — no seed file materialises.
            assert.deepEqual(await fs.readdir(basePath), []);
        });

        it('throws IncorrectUsageError for invalid YAML', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), 'routes:\n\t- broken', 'utf8');

            await assert.rejects(createStore().get(), (err: {code?: string}) => {
                assert.equal(err.code, 'YAML_PARSER_ERROR');
                return true;
            });
        });

        it('throws ValidationError for structurally invalid settings', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), 'routes:\n  no-slashes: about\n', 'utf8');

            await assert.rejects(createStore().get(), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'ValidationError');
                return true;
            });
        });

        it('throws InternalServerError when the settings folder is not accessible', async function () {
            const fileAsBasePath = path.join(basePath, 'not-a-directory');
            await fs.writeFile(fileAsBasePath, 'plain file', 'utf8');

            const store = createStore({basePath: fileAsBasePath});

            await assert.rejects(store.get(), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'InternalServerError');
                return true;
            });
        });

        it('throws InternalServerError when default-routes.yaml is missing on the empty state', async function () {
            await fs.remove(path.join(defaultsPath, 'default-routes.yaml'));

            await assert.rejects(createStore().get(), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'InternalServerError');
                return true;
            });
        });
    });

    describe('replace', function () {
        it('writes the original yaml verbatim to routes.yaml', async function () {
            await createStore().replace(fromYaml(SAMPLE_YAML));

            assert.equal(await fs.readFile(path.join(basePath, 'routes.yaml'), 'utf8'), SAMPLE_YAML);
        });

        it('preserves comments and formatting across a replace → get round-trip', async function () {
            const store = createStore();

            await store.replace(fromYaml(SAMPLE_YAML));

            assert.equal((await store.get()).yamlSource, SAMPLE_YAML);
        });

        it('round-trips the domain model through get', async function () {
            const store = createStore();

            await store.replace(sampleSettings());

            assert.deepEqual(await store.get(), sampleSettings());
        });

        it('creates the settings directory when it does not exist', async function () {
            const missingDir = path.join(basePath, 'nested', 'settings');
            const store = createStore({basePath: missingDir});

            await store.replace(fromYaml(SAMPLE_YAML));

            assert.equal(await fs.readFile(path.join(missingDir, 'routes.yaml'), 'utf8'), SAMPLE_YAML);
        });

        it('does not create a backup when no previous file exists', async function () {
            await createStore().replace(sampleSettings());

            assert.deepEqual(await fs.readdir(basePath), ['routes.yaml']);
        });

        it('backs up the previous routes.yaml before overwriting', async function () {
            const backupPath = path.join(basePath, 'routes-backup.yaml');
            const store = createStore({getBackupFilePath: () => backupPath});

            const first = fromYaml(SAMPLE_YAML);
            await store.replace(first);

            const second = buildRouteSettings({
                routes: [],
                collections: [],
                taxonomies: {tag: '/topic/{slug}/'}
            });
            await store.replace(second);

            assert.equal(await fs.readFile(backupPath, 'utf8'), first.yamlSource);
            assert.deepEqual(await store.get(), second);
        });

        it('throws InternalServerError when the settings folder is not writable', async function () {
            const fileAsBasePath = path.join(basePath, 'not-a-directory');
            await fs.writeFile(fileAsBasePath, 'plain file', 'utf8');

            const store = createStore({basePath: fileAsBasePath});

            await assert.rejects(store.replace(sampleSettings()), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'InternalServerError');
                return true;
            });
        });
    });
});
