import assert from 'node:assert/strict';
import ContentCSVImporter from '../../../../../../core/server/services/content-import/import/importer';
import {ImportRunStore} from '../../../../../../core/server/services/content-import/import/store';
import type {PostImportRow} from '../../../../../../core/server/services/content-import/import/row';
import type {PostData} from '../../../../../../core/server/services/content-import/import/post-data';

const row = (title: string, html = `<p>${title}</p>`): PostImportRow => ({
    title,
    html,
    published_at: '2025-01-01T00:00:00.000Z'
});

// Collaborators are handed back as `deps` so a test can repoint the seam it is breaking.
function harness(rows: PostImportRow[] = [row('First'), row('Second')]) {
    const created: Array<{data: PostData; options: object}> = [];
    const reported: unknown[] = [];
    const jobs: Array<{name: string; offloaded: boolean; job: () => Promise<void>}> = [];
    const createFailures = new Map<string, unknown>();
    const store = new ImportRunStore();
    let converterResolutions = 0;

    const deps = {
        readRows: async () => rows,
        posts: {
            create: async (data: PostData, options: object) => {
                const failure = createFailures.get(data.title);
                if (failure) {
                    throw failure;
                }
                created.push({data, options});
                const id = `post_${created.length}`;
                return {id, toJSON: () => ({id, slug: `slug-${created.length}`})};
            }
        },
        getHtmlToLexical: () => {
            converterResolutions += 1;
            return (html: string) => ({converted: html});
        },
        addJob: (job: {name: string; offloaded: boolean; job: () => Promise<void>}) => {
            jobs.push(job);
        },
        report: (error: unknown) => {
            reported.push(error);
        },
        store,
        urlForPost: (post: {id: string}) => `https://example.com/${post.id}/`,
        newRunId: () => 'run_test'
    };

    const importer = new ContentCSVImporter(deps);

    // The scheduled job is invoked directly rather than through the job manager.
    const run = async () => {
        const accepted = await importer.importCSV({filePath: '/tmp/posts.csv'});
        for (const job of jobs) {
            await job.job();
        }
        return accepted;
    };

    return {importer, run, deps, created, reported, jobs, createFailures, store, converterResolutions: () => converterResolutions};
}

describe('ContentCSVImporter', function () {
    it('accepts the upload with the row count and defers the writes to one inline job', async function () {
        const h = harness();

        const accepted = await h.importer.importCSV({filePath: '/tmp/posts.csv'});

        assert.deepEqual(accepted, {importId: 'run_test', total: 2});
        assert.equal(h.jobs.length, 1);
        assert.equal(h.jobs[0].name, 'content-import');
        assert.equal(h.jobs[0].offloaded, false);
        assert.equal(h.created.length, 0, 'nothing is written until the job runs');
        assert.equal(h.store.get('run_test')?.status, 'running', 'the run is registered before the job starts');
    });

    it('writes one post per row, in order, under the importing options', async function () {
        const h = harness();

        await h.run();

        assert.deepEqual(h.created.map(call => call.data.title), ['First', 'Second']);
        for (const call of h.created) {
            assert.deepEqual(call.options, {importing: true, context: {internal: true}});
        }
    });

    it('rejects a file that cannot be parsed as CSV without scheduling any work', async function () {
        const h = harness();
        const importer = new ContentCSVImporter({...h.deps, readRows: async () => {
            throw new Error('bad bytes');
        }});

        await assert.rejects(
            importer.importCSV({filePath: '/tmp/posts.csv'}),
            (error: {errorType?: string; message?: string}) => {
                assert.equal(error.errorType, 'ValidationError');
                assert.match(error.message ?? '', /could not be parsed as a CSV/);
                return true;
            }
        );

        assert.equal(h.jobs.length, 0, 'no job was scheduled');
    });

    it('resolves the html converter once per run, not per row', async function () {
        const h = harness();

        await h.run();

        assert.equal(h.converterResolutions(), 1);
    });

    it('rejects a file over the cap without scheduling any work', async function () {
        const h = harness(Array.from({length: 101}, (_, i) => row(`Post ${i + 1}`)));

        await assert.rejects(
            h.importer.importCSV({filePath: '/tmp/posts.csv'}),
            (error: {errorType?: string; message?: string}) => {
                assert.equal(error.errorType, 'ValidationError');
                assert.match(error.message ?? '', /more than 100 posts/);
                return true;
            }
        );

        assert.equal(h.jobs.length, 0, 'no job was scheduled');
        assert.equal(h.created.length, 0, 'nothing was written');
        assert.equal(h.store.get('run_test'), undefined, 'no run was registered');
    });

    it('accepts a file exactly at the cap', async function () {
        const h = harness(Array.from({length: 100}, (_, i) => row(`Post ${i + 1}`)));

        const accepted = await h.importer.importCSV({filePath: '/tmp/posts.csv'});

        assert.deepEqual(accepted, {importId: 'run_test', total: 100});
        assert.equal(h.jobs.length, 1);
    });

    it('reports a failed write instead of letting the job reject', async function () {
        const h = harness();
        const failure = new Error('insert failed');
        h.createFailures.set('First', failure);

        await h.run();

        assert.deepEqual(h.reported, [failure]);
        assert.equal(h.store.get('run_test')?.status, 'complete', 'the run still reads as finished');
    });

    it('records a created outcome per row, 1-based, with the post id and URL', async function () {
        const h = harness();

        await h.run();

        const run = h.store.get('run_test');
        assert.equal(run?.status, 'complete');
        assert.ok(run?.finishedAt instanceof Date);
        assert.equal(run?.total, 2);
        assert.deepEqual(run?.rows, [
            {line: 2, title: 'First', status: 'created', postId: 'post_1', url: 'https://example.com/post_1/'},
            {line: 3, title: 'Second', status: 'created', postId: 'post_2', url: 'https://example.com/post_2/'}
        ]);
    });
});
