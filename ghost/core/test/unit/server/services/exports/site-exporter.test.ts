import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import {PassThrough, Readable, Writable, pipeline} from 'stream';
import {SiteExporter, EXPORT_COMPONENTS, type SiteExporterDeps} from '../../../../../core/server/services/exports/site-exporter';

// @tryghost/zip ships no types; only `extract` is used here
const {extract} = require('@tryghost/zip') as {extract(zipPath: string, destination: string): Promise<unknown>};

/** Consumes the archive into a Buffer, resolving on end and rejecting on error. */
function collectArchive(archive: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const sink = new Writable({
            write(chunk, _encoding, callback) {
                chunks.push(chunk);
                callback();
            }
        });
        pipeline(archive, sink, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(Buffer.concat(chunks));
            }
        });
    });
}

async function readZip(buffer: Buffer): Promise<{files: string[], read(name: string): Promise<string>}> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'site-exporter-test-'));
    const zipPath = path.join(dir, 'test.zip');
    const outPath = path.join(dir, 'out');

    await fs.writeFile(zipPath, buffer);
    await extract(zipPath, outPath);

    const entries = await fs.readdir(outPath, {recursive: true, withFileTypes: true});
    const files = entries
        .filter(entry => entry.isFile())
        .map(entry => path.relative(outPath, path.join(entry.parentPath, entry.name)))
        .sort();

    return {
        files,
        read: (name: string) => fs.readFile(path.join(outPath, name), 'utf8')
    };
}

async function stageThemeZip(contents: string): Promise<{zipPath: string, cleanup(): Promise<void>}> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'site-exporter-theme-'));
    const zipPath = path.join(dir, 'theme.zip');
    await fs.writeFile(zipPath, contents);
    return {zipPath, cleanup: () => fs.remove(dir)};
}

function buildDeps(overrides: Partial<SiteExporterDeps> = {}): SiteExporterDeps {
    return {
        exportContent: async () => ({db: [{meta: {}, data: {}}]}),
        exportMembersCSV: async () => Readable.from(['id,email\r\n1,member@example.com']),
        exportPostAnalyticsCSV: async () => Readable.from(['title\r\nA post']),
        listThemes: () => ['casper'],
        zipTheme: () => stageThemeZip('fake-zip-bytes'),
        exportRoutesYaml: async () => 'routes: {}',
        exportRedirectsYaml: async () => '301: {}',
        ...overrides
    };
}

describe('SiteExporter', function () {
    it('composes every component into one zip with an all-ok report', async function () {
        const exporter = new SiteExporter(buildDeps());
        const archive = exporter.createArchive([...EXPORT_COMPONENTS]);

        const zip = await readZip(await collectArchive(archive));

        assert.deepEqual(zip.files, [
            'export-report.json',
            'export.json',
            'members.csv',
            'post-analytics.csv',
            'redirects.yaml',
            'routes.yaml',
            'themes/casper.zip'
        ]);

        const report = JSON.parse(await zip.read('export-report.json'));
        assert.ok(report.generated_at);
        assert.deepEqual(report.components, {
            content: {status: 'ok'},
            members: {status: 'ok'},
            analytics: {status: 'ok'},
            themes: {status: 'ok'},
            routes: {status: 'ok'}
        });
    });

    it('only includes the selected components', async function () {
        const exporter = new SiteExporter(buildDeps());
        const archive = exporter.createArchive(['content', 'routes']);

        const zip = await readZip(await collectArchive(archive));

        assert.deepEqual(zip.files, ['export-report.json', 'export.json', 'redirects.yaml', 'routes.yaml']);
    });

    it('skips a component that fails to acquire and records it as failed', async function () {
        const exporter = new SiteExporter(buildDeps({
            exportPostAnalyticsCSV: async () => {
                throw new Error('analytics blew up');
            }
        }));
        const archive = exporter.createArchive([...EXPORT_COMPONENTS]);

        const zip = await readZip(await collectArchive(archive));

        assert.ok(!zip.files.includes('post-analytics.csv'));
        const report = JSON.parse(await zip.read('export-report.json'));
        assert.deepEqual(report.components.analytics, {status: 'failed'});
        assert.deepEqual(report.components.members, {status: 'ok'});
    });

    it('keeps the remaining themes when one fails to zip and reports partial', async function () {
        const exporter = new SiteExporter(buildDeps({
            listThemes: () => ['casper', 'broken-theme'],
            zipTheme: (name) => {
                if (name === 'broken-theme') {
                    throw new Error('cannot zip');
                }
                return stageThemeZip('fake-zip-bytes');
            }
        }));
        const archive = exporter.createArchive(['themes']);

        const zip = await readZip(await collectArchive(archive));

        assert.ok(zip.files.includes('themes/casper.zip'));
        assert.ok(!zip.files.includes('themes/broken-theme.zip'));
        const report = JSON.parse(await zip.read('export-report.json'));
        assert.deepEqual(report.components.themes, {status: 'partial', skipped: ['broken-theme']});
    });

    it('reports a component failed when every part of it fails', async function () {
        const exporter = new SiteExporter(buildDeps({
            exportRoutesYaml: async () => {
                throw new Error('no routes');
            },
            exportRedirectsYaml: async () => {
                throw new Error('no redirects');
            }
        }));
        const archive = exporter.createArchive(['routes']);

        const zip = await readZip(await collectArchive(archive));

        const report = JSON.parse(await zip.read('export-report.json'));
        assert.deepEqual(report.components.routes, {status: 'failed', skipped: ['routes.yaml', 'redirects.yaml']});
    });

    it('fails the download when a streaming source errors mid-flight', async function () {
        // archiver wraps sources with .pipe(), which never propagates errors —
        // without explicit forwarding the archive would hang forever instead
        // of erroring (a dropped DB connection mid-export must not hang the
        // response)
        const source = new PassThrough();
        const exporter = new SiteExporter(buildDeps({
            exportMembersCSV: async () => source
        }));
        const archive = exporter.createArchive(['members']);

        const collected = collectArchive(archive);

        // Let populate append the entry before the source blows up mid-flight
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        source.write('id,email\r\n');
        source.destroy(new Error('db connection lost'));

        await assert.rejects(collected, /db connection lost/);
    });

    it('destroys streaming sources and cleans up theme files when the client disconnects', async function () {
        const source = new PassThrough();
        source.write('id,email\r\n');

        const staged = await stageThemeZip('fake-zip-bytes');
        const exporter = new SiteExporter(buildDeps({
            exportMembersCSV: async () => source,
            listThemes: () => ['casper'],
            zipTheme: async () => staged
        }));
        const archive = exporter.createArchive(['members', 'themes']);

        const collected = collectArchive(archive).catch(() => {});

        // Give populate a tick to append the entries, then simulate the
        // client hanging up
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        archive.destroy(new Error('client disconnected'));
        await collected;

        // The paused row stream must be released (frees its DB connection)…
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        assert.equal(source.destroyed, true);

        // …and the staged theme zip must be removed
        assert.equal(await fs.pathExists(staged.zipPath), false);
    });
});
