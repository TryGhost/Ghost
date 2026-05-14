/* eslint-disable ghost/mocha/no-setup-in-describe -- runStoreContract is the parameterised-test seam; calling it inside describe is the intended use. */
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

import {FileStore} from '../../../../../core/server/services/custom-redirects/file-store';
import {runStoreContract} from './helpers/store-contract';

const writeJson = (filePath: string, data: unknown): Promise<void> => fs.writeFile(filePath, JSON.stringify(data), 'utf-8');

describe('UNIT: FileStore', function () {
    let basePath: string;

    beforeEach(async function () {
        basePath = path.join(os.tmpdir(), `redirects-filestore-${crypto.randomUUID()}`);
        await fs.ensureDir(basePath);
    });

    afterEach(async function () {
        await fs.remove(basePath);
    });

    runStoreContract({
        createStore: () => new FileStore({basePath})
    });

    describe('getAll: reading existing files', function () {
        it('reads an existing redirects.json file', async function () {
            await writeJson(path.join(basePath, 'redirects.json'), [
                {from: '/a', to: '/b', permanent: true}
            ]);

            const store = new FileStore({basePath});

            assert.deepEqual(await store.getAll(), [
                {from: '/a', to: '/b', permanent: true}
            ]);
        });

        it('reads an existing redirects.yaml file', async function () {
            await fs.writeFile(
                path.join(basePath, 'redirects.yaml'),
                '301:\n  /a/: /b/\n302:\n  /c/: /d/\n',
                'utf-8'
            );

            const store = new FileStore({basePath});

            const result = await store.getAll();

            assert.deepEqual(
                [...result].sort((a, b) => a.from.localeCompare(b.from)),
                [
                    {from: '/a/', to: '/b/', permanent: true},
                    {from: '/c/', to: '/d/', permanent: false}
                ]
            );
        });

        it('prefers redirects.yaml over redirects.json when both exist', async function () {
            await writeJson(path.join(basePath, 'redirects.json'), [
                {from: '/from-json', to: '/to-json', permanent: true}
            ]);
            await fs.writeFile(
                path.join(basePath, 'redirects.yaml'),
                '301:\n  /from-yaml: /to-yaml\n',
                'utf-8'
            );

            const store = new FileStore({basePath});

            assert.deepEqual(await store.getAll(), [
                {from: '/from-yaml', to: '/to-yaml', permanent: true}
            ]);
        });

        it('throws when redirects.json is corrupt', async function () {
            await fs.writeFile(path.join(basePath, 'redirects.json'), '{not valid', 'utf-8');

            const store = new FileStore({basePath});

            await assert.rejects(
                () => store.getAll(),
                {errorType: 'BadRequestError'}
            );
        });
    });

    describe('replaceAll: backups and persistence', function () {
        it('writes a new redirects.json when nothing existed before', async function () {
            const store = new FileStore({basePath});

            await store.replaceAll([{from: '/x', to: '/y', permanent: true}]);

            const onDisk = JSON.parse(
                await fs.readFile(path.join(basePath, 'redirects.json'), 'utf-8')
            );
            assert.deepEqual(onDisk, [{from: '/x', to: '/y', permanent: true}]);
        });

        it('backs up an existing redirects.json before overwriting', async function () {
            const original = [{from: '/old', to: '/old-target', permanent: true}];
            await writeJson(path.join(basePath, 'redirects.json'), original);

            const store = new FileStore({basePath});
            await store.replaceAll([{from: '/new', to: '/new-target', permanent: true}]);

            const entries = await fs.readdir(basePath);
            const backup = entries.find((name: string) => /^redirects-.+\.json$/.test(name));
            assert.ok(backup, `expected a timestamped JSON backup, got: ${entries.join(', ')}`);

            const backupContent = JSON.parse(
                await fs.readFile(path.join(basePath, backup), 'utf-8')
            );
            assert.deepEqual(backupContent, original);
        });

        it('writes JSON regardless of the previous on-disk format', async function () {
            await fs.writeFile(
                path.join(basePath, 'redirects.yaml'),
                '301:\n  /a/: /b/\n',
                'utf-8'
            );

            const store = new FileStore({basePath});
            await store.replaceAll([{from: '/x', to: '/y', permanent: false}]);

            assert.equal(await fs.pathExists(path.join(basePath, 'redirects.yaml')), false);
            assert.equal(await fs.pathExists(path.join(basePath, 'redirects.json')), true);

            const entries = await fs.readdir(basePath);
            assert.ok(
                entries.some((name: string) => /^redirects-.+\.yaml$/.test(name)),
                'previous yaml should be preserved as a timestamped backup'
            );
        });

        it('round-trips through getAll after replaceAll', async function () {
            const store = new FileStore({basePath});
            const redirects = [
                {from: '/a', to: '/b', permanent: true},
                {from: '/c', to: '/d', permanent: false}
            ];

            await store.replaceAll(redirects);

            assert.deepEqual(await store.getAll(), redirects);
        });

        it('overwrites a stale backup of the same name rather than failing', async function () {
            // Inject a stable backup path — the default per-second
            // timestamp would otherwise make this test depend on
            // wall-clock granularity.
            const fixedBackup = path.join(basePath, 'redirects-backup.yaml');
            const yamlPath = path.join(basePath, 'redirects.yaml');
            const store = new FileStore({
                basePath,
                getBackupFilePath: () => fixedBackup
            });

            const firstYaml = '301:\n  /first-backup/: /x/\n';
            const secondYaml = '301:\n  /second-backup/: /z/\n';

            await fs.writeFile(yamlPath, firstYaml, 'utf-8');
            await store.replaceAll([{from: '/first', to: '/x', permanent: true}]);
            await fs.writeFile(yamlPath, secondYaml, 'utf-8');
            await store.replaceAll([{from: '/second', to: '/y', permanent: true}]);

            assert.deepEqual(await store.getAll(), [
                {from: '/second', to: '/y', permanent: true}
            ]);
            // Distinct payloads on each pass — identical content
            // wouldn't distinguish overwrite from no-op.
            assert.equal(await fs.readFile(fixedBackup, 'utf-8'), secondYaml);
        });

        it('preserves the previous redirects on disk when the atomic write fails', async function () {
            const original = [{from: '/old', to: '/old-target', permanent: true}];
            await writeJson(path.join(basePath, 'redirects.json'), original);

            const store = new FileStore({basePath});
            (store as unknown as {_writeAtomic: () => Promise<void>})._writeAtomic = () => Promise.reject(new Error('disk full'));

            await assert.rejects(
                () => store.replaceAll([{from: '/new', to: '/new-target', permanent: true}]),
                {message: 'disk full'}
            );

            assert.deepEqual(await store.getAll(), original);
        });

        it('rolls back the new redirects.json if the post-write yaml backup fails', async function () {
            await fs.writeFile(
                path.join(basePath, 'redirects.yaml'),
                '301:\n  /old/: /old-target/\n',
                'utf-8'
            );

            const store = new FileStore({basePath});
            (store as unknown as {_backup: () => Promise<void>})._backup = () => Promise.reject(new Error('rename forbidden'));

            await assert.rejects(
                () => store.replaceAll([{from: '/new', to: '/new-target', permanent: true}]),
                {message: 'rename forbidden'}
            );

            // Without rollback, getAll() would prefer the surviving
            // yaml and the operator's upload would look like it never
            // happened.
            assert.equal(await fs.pathExists(path.join(basePath, 'redirects.json')), false);
            assert.deepEqual(await store.getAll(), [
                {from: '/old/', to: '/old-target/', permanent: true}
            ]);
        });
    });
});
