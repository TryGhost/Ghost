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

const sampleSettings = (): RouteSettings => ({
    routes: [{type: 'template', path: '/about/', templates: ['about']}],
    collections: [{path: '/', permalink: '/{slug}/', templates: ['index']}],
    taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
});

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

        it('reads a routes.json domain object as-is', async function () {
            await fs.writeFile(path.join(basePath, 'routes.json'), JSON.stringify(sampleSettings()), 'utf8');

            assert.deepEqual(await createStore().get(), sampleSettings());
        });

        it('prefers routes.yaml over routes.json when both exist', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), SAMPLE_YAML, 'utf8');
            await fs.writeFile(path.join(basePath, 'routes.json'), JSON.stringify(sampleSettings()), 'utf8');

            const settings = await createStore().get();

            assert.equal(settings.routes.length, 2);
        });

        it('returns parsed defaults without writing to disk when no canonical file exists', async function () {
            const settings = await createStore().get();

            assert.deepEqual(settings, {
                routes: [],
                collections: [{path: '/', permalink: '/{slug}/', templates: ['index']}],
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
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

        it('throws IncorrectUsageError for corrupt routes.json instead of falling back to defaults', async function () {
            await fs.writeFile(path.join(basePath, 'routes.json'), '{not json', 'utf8');

            await assert.rejects(createStore().get(), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'IncorrectUsageError');
                return true;
            });
        });

        it('throws IncorrectUsageError for routes.json that is not a route settings object', async function () {
            await fs.writeFile(path.join(basePath, 'routes.json'), JSON.stringify(['not', 'settings']), 'utf8');

            await assert.rejects(createStore().get(), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'IncorrectUsageError');
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
        it('writes the domain object as JSON to routes.json', async function () {
            await createStore().replace(sampleSettings());

            const onDisk = JSON.parse(await fs.readFile(path.join(basePath, 'routes.json'), 'utf8'));
            assert.deepEqual(onDisk, sampleSettings());
        });

        it('round-trips through get', async function () {
            const store = createStore();

            await store.replace(sampleSettings());

            assert.deepEqual(await store.get(), sampleSettings());
        });

        it('does not create a backup when no previous file exists', async function () {
            await createStore().replace(sampleSettings());

            assert.deepEqual(await fs.readdir(basePath), ['routes.json']);
        });

        it('backs up the previous routes.json before overwriting', async function () {
            const backupPath = path.join(basePath, 'routes-backup.json');
            const store = createStore({getBackupFilePath: () => backupPath});

            const first = sampleSettings();
            await store.replace(first);

            const second = sampleSettings();
            second.taxonomies = {tag: '/topic/{slug}/'};
            await store.replace(second);

            assert.deepEqual(JSON.parse(await fs.readFile(backupPath, 'utf8')), first);
            assert.deepEqual(await store.get(), second);
        });

        it('skips the backup when the previous routes.json vanishes mid-replace', async function () {
            await fs.writeFile(path.join(basePath, 'routes.json'), JSON.stringify(sampleSettings()), 'utf8');

            // getBackupFilePath runs between the existence check and the
            // backup read — deleting here reproduces the race deterministically.
            const store = createStore({getBackupFilePath: (filePath) => {
                fs.removeSync(path.join(basePath, 'routes.json'));
                return `${filePath}.bak`;
            }});

            const second = sampleSettings();
            second.taxonomies = {tag: '/topic/{slug}/'};
            await store.replace(second);

            assert.equal(await fs.pathExists(path.join(basePath, 'routes.json.bak')), false);
            assert.deepEqual(await store.get(), second);
        });

        it('migrates a legacy routes.yaml to routes.json with a backup', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), SAMPLE_YAML, 'utf8');

            const backupPath = path.join(basePath, 'routes-backup.yaml');
            const store = createStore({getBackupFilePath: () => backupPath});

            await store.replace(sampleSettings());

            assert.equal(await fs.readFile(backupPath, 'utf8'), SAMPLE_YAML);
            assert.equal(await fs.pathExists(path.join(basePath, 'routes.yaml')), false);
            assert.deepEqual(await store.get(), sampleSettings());
        });

        it('rolls back routes.json when the yaml backup fails', async function () {
            await fs.writeFile(path.join(basePath, 'routes.yaml'), SAMPLE_YAML, 'utf8');

            const store = createStore({getBackupFilePath: () => {
                throw new Error('backup exploded');
            }});

            await assert.rejects(store.replace(sampleSettings()), /backup exploded/);

            assert.equal(await fs.pathExists(path.join(basePath, 'routes.json')), false);
            assert.equal(await fs.readFile(path.join(basePath, 'routes.yaml'), 'utf8'), SAMPLE_YAML);
        });
    });

    describe('getBackupRouteSettingsFilePath', function () {
        // Same naming scheme as the legacy SettingsPathManager.getBackupFilePath:
        // routes-yyyy-MM-dd-HH-mm-ss.<ext> next to the canonical file.
        it('produces a timestamped sibling path preserving the extension', function () {
            assert.match(
                getBackupRouteSettingsFilePath('/content/settings/routes.json'),
                /^\/content\/settings\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/
            );
            assert.match(
                getBackupRouteSettingsFilePath('/content/settings/routes.yaml'),
                /^\/content\/settings\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.yaml$/
            );
        });
    });
});
