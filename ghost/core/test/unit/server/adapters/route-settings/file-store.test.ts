import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import {afterEach, beforeEach, describe, it} from 'vitest';

import FileStore, {getBackupRouteSettingsFilePath} from '../../../../../core/server/adapters/route-settings/FileStore';
import RouteSettingsStoreBase from '../../../../../core/server/adapters/route-settings/RouteSettingsStoreBase';
import type {RouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';

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

        // Parity with DefaultSettingsManager.ensureSettingsFileExists: a
        // missing routes.yaml is seeded by copying default-routes.yaml, so
        // self-hosters keep a visible, editable file on disk.
        it('seeds routes.yaml from default-routes.yaml when missing', async function () {
            const settings = await createStore().get();

            const seeded = await fs.readFile(path.join(basePath, 'routes.yaml'), 'utf8');
            const source = await fs.readFile(path.join(defaultsPath, 'default-routes.yaml'), 'utf8');
            assert.equal(seeded, source);

            assert.deepEqual(settings, {
                routes: [],
                collections: [{path: '/', permalink: '/{slug}/', templates: ['index']}],
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            });
        });

        // Parity with SettingsLoader: YAML syntax errors surface as the
        // yaml-parser's IncorrectUsageError with YAML_PARSER_ERROR code.
        it('throws IncorrectUsageError for invalid YAML', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), 'routes:\n\t- broken', 'utf8');

            await assert.rejects(createStore().get(), (err: {code?: string; errorType?: string}) => {
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

        // Parity with DefaultSettingsManager: non-ENOENT read failures are
        // wrapped in an InternalServerError pointing at the settings folder.
        it('throws InternalServerError when the settings folder is not accessible', async function () {
            const fileAsBasePath = path.join(basePath, 'not-a-directory');
            await fs.writeFile(fileAsBasePath, 'plain file', 'utf8');

            const store = createStore({basePath: fileAsBasePath});

            await assert.rejects(store.get(), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'InternalServerError');
                return true;
            });
        });
    });

    describe('replace', function () {
        const sampleSettings = (): RouteSettings => ({
            routes: [{type: 'template', path: '/about/', templates: ['about']}],
            collections: [{path: '/', permalink: '/{slug}/', templates: ['index']}],
            taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        });

        it('writes routes.yaml that round-trips through get', async function () {
            const store = createStore();

            await store.replace(sampleSettings());

            assert.deepEqual(await store.get(), sampleSettings());
        });

        it('does not create a backup when no previous file exists', async function () {
            await createStore().replace(sampleSettings());

            const files = await fs.readdir(basePath);
            assert.deepEqual(files, ['routes.yaml']);
        });

        // Parity with RouteSettings.createBackupFile: the previous canonical
        // file survives as a timestamped copy next to routes.yaml.
        it('backs up the previous routes.yaml before overwriting', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), SAMPLE_YAML, 'utf8');

            const backupPath = path.join(basePath, 'routes-backup.yaml');
            const store = createStore({getBackupFilePath: () => backupPath});

            await store.replace(sampleSettings());

            assert.equal(await fs.readFile(backupPath, 'utf8'), SAMPLE_YAML);

            const updated = await fs.readFile(path.join(basePath, 'routes.yaml'), 'utf8');
            assert.notEqual(updated, SAMPLE_YAML);
        });

        it('round-trips settings read from an existing file', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), SAMPLE_YAML, 'utf8');
            const store = createStore({getBackupFilePath: filePath => `${filePath}.bak`});

            const before = await store.get();
            await store.replace(before);
            const after = await store.get();

            assert.deepEqual(after, before);
        });
    });

    describe('getBackupRouteSettingsFilePath', function () {
        // Same naming scheme as the legacy SettingsPathManager.getBackupFilePath:
        // routes-yyyy-MM-dd-HH-mm-ss.yaml next to the canonical file.
        it('produces a timestamped sibling path', function () {
            const backupPath = getBackupRouteSettingsFilePath('/content/settings/routes.yaml');

            assert.match(backupPath, /^\/content\/settings\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.yaml$/);
        });
    });
});
