import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import ContentCSVImporter from '../../../../../../core/server/services/content-import/import/importer';
import { ImportRunStore } from '../../../../../../core/server/services/content-import/import/store';
import type { PostImportRow } from '../../../../../../core/server/services/content-import/import/row';
import type { PostData } from '../../../../../../core/server/services/content-import/import/post-data';

const row = (title: string, html = `<p>${title}</p>`): PostImportRow => ({
  title,
  html,
  markdown: '',
  published_at: '2025-01-01T00:00:00.000Z',
});

// Collaborators are handed back as `deps` so a test can repoint the seam it is breaking.
function harness(rows: PostImportRow[] = [row('First'), row('Second')]) {
  const created: Array<{ data: PostData; options: object }> = [];
  const reported: unknown[] = [];
  const jobs: Array<{ name: string; offloaded: boolean; job: () => Promise<void> }> = [];
  const createFailures = new Map<string, unknown>();
  const urlFailures = new Map<string, unknown>();
  const store = new ImportRunStore();
  let converterResolutions = 0;
  let markdownRendererResolutions = 0;
  let cleanerResolutions = 0;
  // Late-bound: the importer captures deps at construction.
  let htmlToLexicalFactory: () => (html: string) => unknown = () => {
    converterResolutions += 1;
    return (html: string) => ({ converted: html });
  };
  let markdownToHtmlFactory: () => (markdown: string) => string = () => {
    markdownRendererResolutions += 1;
    return (markdown: string) => `<p>${markdown}</p>`;
  };
  let cleanHTMLFactory: () => (args: { html: string; opinionated: boolean }) => string = () => {
    cleanerResolutions += 1;
    return ({ html }) => html;
  };

  const deps = {
    readRows: async () => rows,
    posts: {
      create: async (data: PostData, options: object) => {
        const failure = createFailures.get(data.title);
        if (failure) {
          throw failure;
        }
        created.push({ data, options });
        const id = `post_${created.length}`;
        return { id, toJSON: () => ({ id, slug: `slug-${created.length}` }) };
      },
    },
    getHtmlToLexical: () => htmlToLexicalFactory(),
    getMarkdownToHtml: () => markdownToHtmlFactory(),
    getCleanHTML: () => cleanHTMLFactory(),
    addJob: (job: { name: string; offloaded: boolean; job: () => Promise<void> }) => {
      jobs.push(job);
    },
    report: (error: unknown) => {
      reported.push(error);
    },
    store,
    urlForPost: (post: { id: string }) => {
      const failure = urlFailures.get(post.id);
      if (failure) {
        throw failure;
      }
      return `https://example.com/${post.id}/`;
    },
    newRunId: () => 'run_test',
    getTimezone: () => 'Europe/Amsterdam',
    now: () => new Date('2026-01-01T10:30:00.000Z'),
  };

  const importer = new ContentCSVImporter(deps);

  // The scheduled job is invoked directly rather than through the job manager.
  const run = async () => {
    const accepted = await importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
    });
    for (const job of jobs) {
      await job.job();
    }
    return accepted;
  };

  const setHtmlToLexicalFactory = (factory: () => (html: string) => unknown) => {
    htmlToLexicalFactory = factory;
  };
  const setMarkdownToHtmlFactory = (factory: () => (markdown: string) => string) => {
    markdownToHtmlFactory = factory;
  };
  const setCleanHTMLFactory = (
    factory: () => (args: { html: string; opinionated: boolean }) => string,
  ) => {
    cleanHTMLFactory = factory;
  };

  return {
    importer,
    run,
    deps,
    created,
    reported,
    jobs,
    createFailures,
    urlFailures,
    store,
    setHtmlToLexicalFactory,
    setMarkdownToHtmlFactory,
    setCleanHTMLFactory,
    converterResolutions: () => converterResolutions,
    markdownRendererResolutions: () => markdownRendererResolutions,
    cleanerResolutions: () => cleanerResolutions,
  };
}

describe('ContentCSVImporter', function () {
  let infoLog: sinon.SinonStub;

  beforeEach(function () {
    infoLog = sinon.stub(logging, 'info');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('accepts the upload with the row count and defers the writes to one inline job', async function () {
    const h = harness();

    const accepted = await h.importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
    });

    assert.deepEqual(accepted, { importId: 'run_test', total: 2 });
    assert.equal(h.jobs.length, 1);
    assert.equal(h.jobs[0].name, 'content-import');
    assert.equal(h.jobs[0].offloaded, false);
    assert.equal(h.created.length, 0, 'nothing is written until the job runs');
    assert.equal(
      h.store.get('run_test')?.status,
      'running',
      'the run is registered before the job starts',
    );
  });

  it('logs the searchable lifecycle of the inline job', async function () {
    const h = harness();

    await h.run();

    sinon.assert.calledWithExactly(infoLog, '[Background Job] content-import queued');
    sinon.assert.calledWithExactly(infoLog, '[Background Job] content-import started');
    sinon.assert.calledWithMatch(infoLog, /^\[Background Job\] content-import completed in \d+ms$/);
  });

  it('uses the current time by default when one is not injected', async function () {
    const h = harness([row('Default clock')]);
    const { now: _now, ...deps } = h.deps;
    const importer = new ContentCSVImporter(deps);

    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await h.jobs[0].job();

    assert.ok(h.store.get('run_test')?.startedAt instanceof Date);
    assert.ok(h.store.get('run_test')?.finishedAt instanceof Date);
  });

  it('keeps lifecycle logging best-effort', async function () {
    const h = harness();
    infoLog.throws(new Error('Logging unavailable'));

    const accepted = await h.run();

    assert.deepEqual(accepted, { importId: 'run_test', total: 2 });
    assert.equal(h.jobs.length, 1, 'the job is queued even when the queued log fails');
    assert.equal(
      h.store.get('run_test')?.status,
      'complete',
      'the job still resolves and finalizes its run',
    );
    assert.equal(h.created.length, 2);
  });

  it('passes a caller-supplied mapping to the CSV reader', async function () {
    const h = harness();
    let receivedMapping: Record<string, string> | undefined;
    const importer = new ContentCSVImporter({
      ...h.deps,
      readRows: async (_path, mapping) => {
        receivedMapping = mapping;
        return [row('Mapped')];
      },
    });

    await importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
      mapping: { Headline: 'title' },
    });

    assert.deepEqual(receivedMapping, { Headline: 'title' });
  });

  it('reads a prepared archive source and cleans it after the job', async function () {
    const h = harness();
    const cleanup = sinon.stub().resolves();
    let receivedPath: string | undefined;
    const importer = new ContentCSVImporter({
      ...h.deps,
      prepareSource: async () => ({ filePath: '/tmp/extracted/posts.csv', cleanup }),
      readRows: async (filePath) => {
        receivedPath = filePath;
        return [row('Prepared')];
      },
    });

    await importer.importCSV({ filePath: '/tmp/upload', fileName: 'posts.zip' });

    assert.equal(receivedPath, '/tmp/extracted/posts.csv');
    sinon.assert.notCalled(cleanup);
    await h.jobs[0].job();
    sinon.assert.calledOnce(cleanup);
  });

  it('stores and rewrites every asset before resolving content converters', async function () {
    const h = harness([row('Prepared', '<img src="/content/images/original.jpg">')]);
    const events: string[] = [];
    const cleanup = sinon.stub().resolves();
    const assets = {
      files: [],
      store: async () => {
        events.push('store');
      },
      rewriteRows: (rows: PostImportRow[]) => {
        events.push('rewrite');
        rows[0].html = '<img src="/content/images/unique.jpg">';
      },
    };
    h.setHtmlToLexicalFactory(() => {
      events.push('convert');
      return (html: string) => ({ converted: html });
    });
    const importer = new ContentCSVImporter({
      ...h.deps,
      prepareSource: async () => ({
        filePath: '/tmp/extracted/posts.csv',
        assets,
        cleanup,
      }),
    });

    await importer.importCSV({ filePath: '/tmp/posts.zip', fileName: 'posts.zip' });
    await h.jobs[0].job();

    assert.deepEqual(events.slice(0, 3), ['store', 'rewrite', 'convert']);
    assert.match(h.created[0].data.lexical ?? '', /unique\.jpg/);
    sinon.assert.calledOnce(cleanup);
  });

  it('fails the run without converting or creating posts when asset storage fails', async function () {
    const h = harness();
    const failure = new Error('storage unavailable');
    const cleanup = sinon.stub().resolves();
    const rewriteRows = sinon.stub();
    const importer = new ContentCSVImporter({
      ...h.deps,
      prepareSource: async () => ({
        filePath: '/tmp/extracted/posts.csv',
        assets: {
          files: [],
          store: async () => {
            throw failure;
          },
          rewriteRows,
        },
        cleanup,
      }),
    });

    await importer.importCSV({ filePath: '/tmp/posts.zip', fileName: 'posts.zip' });
    await h.jobs[0].job();

    assert.equal(h.converterResolutions(), 0);
    assert.equal(h.created.length, 0);
    assert.equal(h.store.get('run_test')?.status, 'failed');
    assert.equal(h.store.get('run_test')?.failureReason, 'storage unavailable');
    assert.equal(h.reported.at(-1), failure);
    sinon.assert.notCalled(rewriteRows);
    sinon.assert.calledOnce(cleanup);
  });

  it('writes one post per row, in order, under the importing options', async function () {
    const h = harness();

    await h.run();

    assert.deepEqual(
      h.created.map((call) => call.data.title),
      ['First', 'Second'],
    );
    for (const call of h.created) {
      assert.deepEqual(call.options, { importing: true, context: { internal: true } });
    }
  });

  it('files every row of a run under a date-stamped tag and a unique run tag', async function () {
    const h = harness();

    await h.run();

    // 10:30 UTC is 11:30 in Amsterdam: the stamp follows the site timezone
    for (const call of h.created) {
      assert.deepEqual(call.data.tags, [
        { name: '#Import 2026-01-01 11:30' },
        { name: '#Import Run run_test' },
      ]);
    }
  });

  it('rejects a file that cannot be parsed as CSV without scheduling any work', async function () {
    const h = harness();
    const cleanupError = new Error('cleanup failed');
    const cleanup = sinon.stub().rejects(cleanupError);
    const importer = new ContentCSVImporter({
      ...h.deps,
      prepareSource: async () => ({ filePath: '/tmp/extracted/posts.csv', cleanup }),
      readRows: async () => {
        throw new Error('bad bytes');
      },
    });

    await assert.rejects(
      importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' }),
      (error: { errorType?: string; message?: string }) => {
        assert.equal(error.errorType, 'ValidationError');
        assert.match(error.message ?? '', /could not be parsed as a CSV/);
        return true;
      },
    );

    assert.equal(h.jobs.length, 0, 'no job was scheduled');
    sinon.assert.calledOnce(cleanup);
    assert.equal(h.reported.at(-1), cleanupError);
  });

  it('resolves the html converter once per run, not per row', async function () {
    const h = harness();

    await h.run();

    assert.equal(h.converterResolutions(), 1);
  });

  it('resolves the markdown renderer once per run, not per row', async function () {
    const h = harness();

    await h.run();

    assert.equal(h.markdownRendererResolutions(), 1);
  });

  it('resolves the HTML cleaner once per run, not per row', async function () {
    const h = harness();

    await h.run();

    assert.equal(h.cleanerResolutions(), 1);
  });

  it('rejects a file over the cap without scheduling any work', async function () {
    const h = harness(Array.from({ length: 101 }, (_, i) => row(`Post ${i + 1}`)));
    const cleanup = sinon.stub().resolves();
    const storeAssets = sinon.stub().resolves();
    const importer = new ContentCSVImporter({
      ...h.deps,
      prepareSource: async () => ({
        filePath: '/tmp/extracted/posts.csv',
        assets: {
          files: [],
          store: storeAssets,
          rewriteRows: sinon.stub(),
        },
        cleanup,
      }),
    });

    await assert.rejects(
      importer.importCSV({ filePath: '/tmp/posts.zip', fileName: 'posts.zip' }),
      (error: { errorType?: string; message?: string }) => {
        assert.equal(error.errorType, 'ValidationError');
        assert.match(error.message ?? '', /more than 100 posts/);
        return true;
      },
    );

    assert.equal(h.jobs.length, 0, 'no job was scheduled');
    assert.equal(h.created.length, 0, 'nothing was written');
    assert.equal(h.store.get('run_test'), undefined, 'no run was registered');
    sinon.assert.notCalled(storeAssets);
    sinon.assert.calledOnce(cleanup);
  });

  it('cleans a prepared source if scheduling throws', async function () {
    const h = harness();
    const cleanup = sinon.stub().resolves();
    const importer = new ContentCSVImporter({
      ...h.deps,
      prepareSource: async () => ({ filePath: '/tmp/extracted/posts.csv', cleanup }),
      addJob: () => {
        throw new Error('queue unavailable');
      },
    });

    await assert.rejects(
      importer.importCSV({ filePath: '/tmp/posts.zip', fileName: 'posts.zip' }),
      /queue unavailable/,
    );
    assert.equal(h.store.get('run_test')?.status, 'failed');
    assert.equal(h.store.get('run_test')?.failureReason, 'queue unavailable');
    sinon.assert.calledOnce(cleanup);
  });

  it('reports cleanup failures without rejecting the completed job', async function () {
    const h = harness();
    const cleanupError = new Error('cleanup failed');
    const importer = new ContentCSVImporter({
      ...h.deps,
      prepareSource: async () => ({
        filePath: '/tmp/extracted/posts.csv',
        cleanup: async () => {
          throw cleanupError;
        },
      }),
    });

    await importer.importCSV({ filePath: '/tmp/posts.zip', fileName: 'posts.zip' });
    await h.jobs[0].job();

    assert.equal(h.store.get('run_test')?.status, 'complete');
    assert.equal(h.reported.at(-1), cleanupError);
  });

  it('accepts a file exactly at the cap', async function () {
    const h = harness(Array.from({ length: 100 }, (_, i) => row(`Post ${i + 1}`)));

    const accepted = await h.importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
    });

    assert.deepEqual(accepted, { importId: 'run_test', total: 100 });
    assert.equal(h.jobs.length, 1);
  });

  it('records a failed write against its row and imports the rest', async function () {
    const h = harness([row('First'), row('Second'), row('Third')]);
    h.createFailures.set('Second', new Error('insert failed'));

    await h.run();

    assert.deepEqual(
      h.created.map((call) => call.data.title),
      ['First', 'Third'],
      'the other rows still imported',
    );
    assert.deepEqual(h.reported, [], 'a row outcome is recorded, not reported');

    const run = h.store.get('run_test');
    assert.equal(run?.status, 'complete');
    assert.deepEqual(run?.rows[1], {
      line: 3,
      title: 'Second',
      status: 'failed',
      reason: 'insert failed',
    });
  });

  it('reports once when every attempted write fails', async function () {
    const h = harness([row('First'), row('Second')]);
    h.createFailures.set('First', new Error('first insert failed'));
    h.createFailures.set('Second', new Error('second insert failed'));

    await h.run();

    assert.equal(h.created.length, 0);
    assert.equal(h.reported.length, 1);
    assert.equal((h.reported[0] as { errorType?: string }).errorType, 'InternalServerError');
    assert.equal(
      (h.reported[0] as Error).message,
      'Content import failed to write all 2 attempted posts.',
    );
    assert.match(
      (h.reported[0] as Error).stack ?? '',
      /first insert failed/,
      'the first write failure is preserved as the cause',
    );
    assert.equal(h.store.get('run_test')?.status, 'complete');
    assert.deepEqual(
      h.store.get('run_test')?.rows.map((outcome) => outcome.status),
      ['failed', 'failed'],
    );
  });

  it('skips a malformed row on its own and imports the rest', async function () {
    const h = harness([
      row('First'),
      { title: '', html: '<p>No title</p>', markdown: '', published_at: undefined },
      row('Third'),
    ]);

    await h.run();

    assert.deepEqual(
      h.created.map((call) => call.data.title),
      ['First', 'Third'],
    );

    const run = h.store.get('run_test');
    assert.equal(run?.status, 'complete');
    assert.deepEqual(run?.rows[1], {
      line: 3,
      title: null,
      status: 'skipped',
      reason: 'title is required',
    });
    assert.deepEqual(
      run?.rows.map((r) => r.status),
      ['created', 'skipped', 'created'],
    );
  });

  it('isolates a markdown conversion failure to its row', async function () {
    const badMarkdown = { ...row('Bad markdown', ''), markdown: 'bad' };
    const h = harness([row('First'), badMarkdown, row('Third')]);
    h.setMarkdownToHtmlFactory(() => (markdown: string) => {
      if (markdown === 'bad') {
        throw new Error('bad markdown');
      }
      return `<p>${markdown}</p>`;
    });

    await h.run();

    assert.deepEqual(
      h.created.map((call) => call.data.title),
      ['First', 'Third'],
    );
    assert.deepEqual(h.store.get('run_test')?.rows[1], {
      line: 3,
      title: 'Bad markdown',
      status: 'skipped',
      reason: 'markdown could not be converted',
    });
  });

  it('isolates an HTML cleaning failure to its row', async function () {
    const h = harness([row('First'), row('Bad clean'), row('Third')]);
    h.setCleanHTMLFactory(() => ({ html }) => {
      if (html.includes('Bad clean')) {
        throw new Error('cleaner failed');
      }
      return html;
    });

    await h.run();

    assert.deepEqual(
      h.created.map((call) => call.data.title),
      ['First', 'Third'],
    );
    assert.deepEqual(h.store.get('run_test')?.rows[1], {
      line: 3,
      title: 'Bad clean',
      status: 'skipped',
      reason: 'html could not be cleaned',
    });
  });

  it('completes without reporting when every row is skipped before a write', async function () {
    const h = harness([
      { title: '', html: '<p>No title</p>', markdown: '', published_at: undefined },
      { title: '', html: '<p>Still no title</p>', markdown: '', published_at: undefined },
    ]);

    await h.run();

    assert.deepEqual(h.reported, []);
    assert.equal(h.store.get('run_test')?.status, 'complete');
    assert.deepEqual(
      h.store.get('run_test')?.rows.map((outcome) => outcome.status),
      ['skipped', 'skipped'],
    );
  });

  it("still reports a run-level failure that is nobody's row", async function () {
    const h = harness();
    const failure = new Error('converter unavailable');
    h.setHtmlToLexicalFactory(() => {
      throw failure;
    });

    await h.run();

    assert.deepEqual(h.reported, [failure]);
    assert.equal(h.store.get('run_test')?.status, 'failed');
    assert.equal(h.store.get('run_test')?.failureReason, 'converter unavailable');
    assert.ok(h.store.get('run_test')?.finishedAt instanceof Date);
    sinon.assert.calledWithMatch(infoLog, /^\[Background Job\] content-import failed after \d+ms$/);
  });

  it('stops the run for an unexpected row-processing failure', async function () {
    const failure = new Error('unexpected row failure');
    const badRow = row('Bad row');
    Object.defineProperty(badRow, 'html', {
      get() {
        throw failure;
      },
    });
    const h = harness([badRow, row('Never reached')]);

    await h.run();

    assert.deepEqual(h.reported, [failure]);
    assert.equal(h.created.length, 0);
    assert.equal(h.store.get('run_test')?.status, 'failed');
    assert.equal(h.store.get('run_test')?.failureReason, 'unexpected row failure');
  });

  it('uses a safe reason when a run-level failure has no message', async function () {
    const h = harness();
    h.setHtmlToLexicalFactory(() => {
      throw {};
    });

    await h.run();

    assert.deepEqual(h.reported, [{}]);
    assert.equal(h.store.get('run_test')?.status, 'failed');
    assert.equal(h.store.get('run_test')?.failureReason, 'Unknown error');
  });

  it('keeps a successfully written post created when its URL cannot be resolved', async function () {
    const h = harness();
    h.urlFailures.set('post_1', new Error('URL service unavailable'));

    await h.run();

    assert.equal(h.created.length, 2);
    assert.deepEqual(h.store.get('run_test')?.rows, [
      { line: 2, title: 'First', status: 'created', postId: 'post_1' },
      {
        line: 3,
        title: 'Second',
        status: 'created',
        postId: 'post_2',
        url: 'https://example.com/post_2/',
      },
    ]);
    assert.equal(h.reported.length, 1);
    assert.equal(
      (h.reported[0] as Error).message,
      'Content import could not resolve a URL for 1 created post.',
    );
    assert.match((h.reported[0] as Error).stack ?? '', /URL service unavailable/);
  });

  it('reports multiple URL resolution failures once per run', async function () {
    const h = harness();
    h.urlFailures.set('post_1', new Error('first URL failure'));
    h.urlFailures.set('post_2', new Error('second URL failure'));

    await h.run();

    assert.deepEqual(
      h.store.get('run_test')?.rows.map((outcome) => outcome.status),
      ['created', 'created'],
    );
    assert.equal(h.reported.length, 1);
    assert.equal(
      (h.reported[0] as Error).message,
      'Content import could not resolve a URL for 2 created posts.',
    );
    assert.match(
      (h.reported[0] as Error).stack ?? '',
      /first URL failure/,
      'the first URL failure is preserved as the cause',
    );
  });

  it('records a created outcome per row, 1-based, with the post id and URL', async function () {
    const h = harness();

    await h.run();

    const run = h.store.get('run_test');
    assert.equal(run?.status, 'complete');
    assert.ok(run?.finishedAt instanceof Date);
    assert.equal(run?.total, 2);
    assert.deepEqual(run?.rows, [
      {
        line: 2,
        title: 'First',
        status: 'created',
        postId: 'post_1',
        url: 'https://example.com/post_1/',
      },
      {
        line: 3,
        title: 'Second',
        status: 'created',
        postId: 'post_2',
        url: 'https://example.com/post_2/',
      },
    ]);
  });
});
