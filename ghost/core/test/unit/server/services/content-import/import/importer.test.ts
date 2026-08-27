import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import ContentCSVImporter from '../../../../../../core/server/services/content-import/import/importer';
import { MediaInliningFailure } from '../../../../../../core/server/services/content-import/import/media';
import { ImportRunStore } from '../../../../../../core/server/services/content-import/import/store';
import type { PostImportRow } from '../../../../../../core/server/services/content-import/import/row';
import type { PostData } from '../../../../../../core/server/services/content-import/import/post-data';
import type { PostWriteMetadata } from '../../../../../../core/server/services/content-import/import/post-repository';
import type { ImportRun } from '../../../../../../core/server/services/content-import/import/store';

const row = (title: string, html = `<p>${title}</p>`): PostImportRow => ({
  title,
  html,
  markdown: '',
  published_at: '2025-01-01T00:00:00.000Z',
});

// Collaborators are handed back as `deps` so a test can repoint the seam it is breaking.
function harness(
  rows: PostImportRow[] = [row('First'), row('Second')],
  source?: { columns: string[]; rows: Array<Record<string, string>> },
) {
  const created: Array<{ data: PostData; options: object; metadata?: PostWriteMetadata }> = [];
  const reported: unknown[] = [];
  const jobs: Array<{ name: string; offloaded: boolean; job: () => Promise<void> }> = [];
  const createFailures = new Map<string, unknown>();
  const duplicateSlugs = new Set<string>();
  const updatedTitles = new Set<string>();
  const warningsByTitle = new Map<string, string[]>();
  const urlFailures = new Map<string, unknown>();
  const inlineMedia = sinon.stub().resolves();
  const createMediaInliner = sinon.stub().callsFake(() => ({ inline: inlineMedia }));
  const store = new ImportRunStore();
  const releaseRun = sinon.stub(store, 'release');
  const sentRuns: ImportRun[] = [];
  const sentRecipients: string[] = [];
  const sendEmail = sinon.stub().callsFake(async (run: ImportRun, recipient: string) => {
    sentRuns.push(run);
    sentRecipients.push(recipient);
  });
  const getDefaultRecipient = sinon.stub().resolves('owner@example.com');
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
    readRows: async () =>
      source
        ? {
            columns: source.columns,
            rows: rows.map((data, index) => ({ data, source: source.rows[index] })),
          }
        : rows,
    posts: {
      write: async (data: PostData, options: object, metadata?: PostWriteMetadata) => {
        const failure = createFailures.get(data.title);
        if (failure) {
          throw failure;
        }
        if (duplicateSlugs.has(data.slug)) {
          return {
            status: 'skipped' as const,
            reason: `A post with the slug "${data.slug}" already exists.`,
            duplicate: { origin: 'pre_existing' as const, matchedBy: 'slug' as const },
          };
        }
        created.push({ data, options, metadata });
        const id = `post_${created.length}`;
        return {
          status: updatedTitles.has(data.title) ? ('updated' as const) : ('created' as const),
          post: { id, toJSON: () => ({ id, slug: `slug-${created.length}` }) },
          warnings: warningsByTitle.get(data.title) ?? [],
        };
      },
    },
    getHtmlToLexical: () => htmlToLexicalFactory(),
    getMarkdownToHtml: () => markdownToHtmlFactory(),
    getCleanHTML: () => cleanHTMLFactory(),
    createMediaInliner,
    email: {
      send: sendEmail,
      getDefaultRecipient,
    },
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
    duplicateSlugs,
    updatedTitles,
    warningsByTitle,
    urlFailures,
    inlineMedia,
    createMediaInliner,
    sendEmail,
    getDefaultRecipient,
    sentRuns,
    sentRecipients,
    releaseRun,
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

  it('carries original source columns and cells into the completed run', async function () {
    const h = harness([row('Mapped title')], {
      columns: ['Headline', 'Body', 'Ignored'],
      rows: [{ Headline: 'Mapped title', Body: '<p>Source body</p>', Ignored: 'kept' }],
    });

    await h.run();

    assert.deepEqual(h.sentRuns[0].sourceColumns, ['Headline', 'Body', 'Ignored']);
    assert.deepEqual(h.sentRuns[0].rows[0].source, {
      Headline: 'Mapped title',
      Body: '<p>Source body</p>',
      Ignored: 'kept',
    });
  });

  it('emails the requesting user once after completing and releases the run', async function () {
    const h = harness();

    await h.importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
      requestUserEmail: 'requester@example.com',
    });
    await h.jobs[0].job();

    sinon.assert.notCalled(h.getDefaultRecipient);
    sinon.assert.calledOnce(h.sendEmail);
    assert.deepEqual(h.sentRecipients, ['requester@example.com']);
    assert.equal(h.sentRuns[0].status, 'complete');
    sinon.assert.calledOnceWithExactly(h.releaseRun, 'run_test');
  });

  it('falls back to Owner and reports email delivery failures without failing the run', async function () {
    const h = harness();
    const failure = new Error('mail unavailable');
    h.sendEmail.rejects(failure);

    await h.run();

    sinon.assert.calledOnce(h.getDefaultRecipient);
    sinon.assert.calledOnceWithExactly(
      h.sendEmail,
      sinon.match({ status: 'complete' }),
      'owner@example.com',
    );
    assert.equal(h.reported.at(-1), failure);
    sinon.assert.calledOnceWithExactly(h.releaseRun, 'run_test');
  });

  it('does not prepare or schedule an import when the Owner recipient cannot be resolved', async function () {
    const h = harness();
    const failure = new Error('Owner unavailable');
    const prepareSource = sinon.stub().resolves({
      filePath: '/tmp/posts.csv',
      cleanup: sinon.stub().resolves(),
    });
    h.getDefaultRecipient.rejects(failure);
    const importer = new ContentCSVImporter({ ...h.deps, prepareSource });

    await assert.rejects(
      importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' }),
      failure,
    );

    sinon.assert.notCalled(prepareSource);
    assert.equal(h.jobs.length, 0);
    sinon.assert.notCalled(h.sendEmail);
  });

  it('emails a failed accepted run before releasing it', async function () {
    const h = harness();
    const failure = new Error('converter unavailable');
    h.setHtmlToLexicalFactory(() => {
      throw failure;
    });

    await h.run();

    sinon.assert.calledOnce(h.sendEmail);
    assert.equal(h.sentRuns[0].status, 'failed');
    assert.equal(h.sentRuns[0].failureReason, 'converter unavailable');
    sinon.assert.calledOnceWithExactly(h.releaseRun, 'run_test');
  });

  it('finishes safely if an injected store loses the run before the job settles', async function () {
    const h = harness();
    h.releaseRun.restore();

    await h.importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    h.store.release('run_test');
    await h.jobs[0].job();

    sinon.assert.notCalled(h.sendEmail);
    assert.equal(h.created.length, 2);
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
    h.inlineMedia.callsFake(async (data: PostData) => {
      events.push('inline');
      assert.match(data.lexical ?? '', /unique\.jpg/);
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

    assert.deepEqual(events.slice(0, 4), ['store', 'rewrite', 'convert', 'inline']);
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
      assert.deepEqual(call.metadata, {
        sourceUpdatedAt: undefined,
        runTagName: '#Import Run run_test',
        authorNames: undefined,
        authorEmails: undefined,
        tagNames: undefined,
      });
    }
  });

  it('inlines built post data before opening the repository write transaction', async function () {
    const h = harness([row('Inline order')]);
    const events: string[] = [];
    h.setHtmlToLexicalFactory(() => (html: string) => {
      events.push('convert');
      return { converted: html };
    });
    h.inlineMedia.callsFake(async (data: PostData) => {
      events.push('inline');
      data.feature_image = '__GHOST_URL__/content/images/inlined.jpg';
    });
    const write = h.deps.posts.write;
    const importer = new ContentCSVImporter({
      ...h.deps,
      posts: {
        write: async (data, options, metadata) => {
          events.push('write');
          assert.equal(data.feature_image, '__GHOST_URL__/content/images/inlined.jpg');
          return write(data, options, metadata);
        },
      },
    });

    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await h.jobs[0].job();

    assert.deepEqual(events, ['convert', 'inline', 'write']);
  });

  it('creates an isolated media inliner for every import run', async function () {
    const h = harness([row('Cached media')]);

    await h.importer.importCSV({ filePath: '/tmp/first.csv', fileName: 'first.csv' });
    await h.jobs[0].job();
    await h.importer.importCSV({ filePath: '/tmp/second.csv', fileName: 'second.csv' });
    await h.jobs[1].job();

    sinon.assert.calledTwice(h.createMediaInliner);
    assert.notEqual(
      h.createMediaInliner.firstCall.returnValue,
      h.createMediaInliner.secondCall.returnValue,
    );
  });

  it('records expected media failures against one row and imports the rest', async function () {
    const h = harness([row('First'), row('Media failure'), row('Third')]);
    const failure = new MediaInliningFailure([
      { sourceUrl: 'https://assets.test/missing.jpg', reason: 'Download failed.' },
      { sourceUrl: 'https://assets.test/broken.mp4', reason: 'Storage failed.' },
    ]);
    h.inlineMedia.callsFake(async (data: PostData) => {
      if (data.title === 'Media failure') {
        throw failure;
      }
    });

    await h.run();

    assert.deepEqual(
      h.created.map((call) => call.data.title),
      ['First', 'Third'],
    );
    assert.equal(h.inlineMedia.callCount, 3);
    assert.deepEqual(h.reported, []);
    assert.equal(h.store.get('run_test')?.status, 'complete');
    assert.deepEqual(h.store.get('run_test')?.rows[1], {
      line: 3,
      title: 'Media failure',
      status: 'failed',
      reason: 'Could not import 2 media files.',
      mediaFailures: [
        { sourceUrl: 'https://assets.test/missing.jpg', reason: 'Download failed.' },
        { sourceUrl: 'https://assets.test/broken.mp4', reason: 'Storage failed.' },
      ],
    });
  });

  it('reports once when media failures prevent every post write', async function () {
    const h = harness([row('First'), row('Second')]);
    const failure = new MediaInliningFailure([
      { sourceUrl: 'https://assets.test/missing.jpg', reason: 'Download failed.' },
    ]);
    h.inlineMedia.rejects(failure);

    await h.run();

    assert.equal(h.created.length, 0);
    assert.equal(h.reported.length, 1);
    assert.equal(
      (h.reported[0] as Error).message,
      'Content import failed to write all 2 attempted posts.',
    );
    assert.match((h.reported[0] as Error).stack ?? '', /Could not import 1 media file/);
    assert.equal(h.store.get('run_test')?.status, 'complete');
    assert.deepEqual(
      h.store.get('run_test')?.rows.map((outcome) => outcome.status),
      ['failed', 'failed'],
    );
  });

  it('stops the run when media preparation throws an unexpected error', async function () {
    const h = harness([row('Media defect'), row('Never reached')]);
    const failure = new Error('media importer defect');
    h.inlineMedia.rejects(failure);

    await h.run();

    assert.equal(h.created.length, 0);
    assert.equal(h.inlineMedia.callCount, 1);
    assert.deepEqual(h.reported, [failure]);
    assert.equal(h.store.get('run_test')?.status, 'failed');
    assert.equal(h.store.get('run_test')?.failureReason, failure.message);
  });

  it('does not inspect media for a row failed during post-data validation', async function () {
    const h = harness([
      { title: '', html: '<p>No title</p>', markdown: '', published_at: undefined },
      row('Valid row'),
    ]);

    await h.run();

    sinon.assert.calledOnce(h.inlineMedia);
    assert.equal(h.inlineMedia.firstCall.args[0].title, 'Valid row');
  });

  it('forwards author and tag cells to the transactional write seam', async function () {
    const h = harness([
      {
        ...row('Related post'),
        authors: 'Alice, Bob',
        author_emails: 'alice@example.com, bob@example.com',
        tags: 'News, Features',
      },
    ]);

    await h.run();

    assert.deepEqual(h.created[0].metadata, {
      sourceUpdatedAt: undefined,
      runTagName: '#Import Run run_test',
      authorNames: 'Alice, Bob',
      authorEmails: 'alice@example.com, bob@example.com',
      tagNames: 'News, Features',
    });
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
    sinon.assert.notCalled(h.sendEmail);
    sinon.assert.calledOnceWithExactly(h.releaseRun, 'run_test');
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

  it('records an existing slug as skipped without treating it as a failed write', async function () {
    const h = harness([row('Duplicate'), row('Created')]);
    h.duplicateSlugs.add('duplicate');

    await h.run();

    assert.deepEqual(
      h.created.map((call) => call.data.title),
      ['Created'],
    );
    assert.deepEqual(h.reported, []);
    assert.deepEqual(h.store.get('run_test')?.rows, [
      {
        line: 2,
        title: 'Duplicate',
        status: 'skipped',
        reason: 'A post with the slug "duplicate" already exists.',
        duplicate: { origin: 'pre_existing', matchedBy: 'slug' },
      },
      {
        line: 3,
        title: 'Created',
        status: 'created',
        postId: 'post_1',
        url: 'https://example.com/post_1/',
      },
    ]);
  });

  it('records an updated post and forwards only its explicit source timestamp', async function () {
    const updatedRow = { ...row('Updated'), updated_at: '2025-02-01T00:00:00.000Z' };
    const h = harness([updatedRow]);
    h.updatedTitles.add('Updated');

    await h.run();

    assert.deepEqual(h.created[0].metadata, {
      sourceUpdatedAt: '2025-02-01T00:00:00.000Z',
      runTagName: '#Import Run run_test',
      authorNames: undefined,
      authorEmails: undefined,
      tagNames: undefined,
    });
    assert.deepEqual(h.store.get('run_test')?.rows, [
      {
        line: 2,
        title: 'Updated',
        status: 'updated',
        postId: 'post_1',
        url: 'https://example.com/post_1/',
      },
    ]);
  });

  it('records a failed update against its row and continues importing', async function () {
    const h = harness([row('Update failure'), row('Created')]);
    h.updatedTitles.add('Update failure');
    h.createFailures.set('Update failure', new Error('update failed'));

    await h.run();

    assert.deepEqual(h.store.get('run_test')?.rows[0], {
      line: 2,
      title: 'Update failure',
      status: 'failed',
      reason: 'update failed',
    });
    assert.deepEqual(
      h.created.map((call) => call.data.title),
      ['Created'],
    );
    assert.deepEqual(h.reported, []);
  });

  it('completes without reporting when every row is an existing slug', async function () {
    const h = harness([row('First'), row('Second')]);
    h.duplicateSlugs.add('first');
    h.duplicateSlugs.add('second');

    await h.run();

    assert.equal(h.created.length, 0);
    assert.deepEqual(h.reported, []);
    assert.deepEqual(
      h.store.get('run_test')?.rows.map((outcome) => outcome.status),
      ['skipped', 'skipped'],
    );
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

  it('uses the singular post noun when the only attempted write fails', async function () {
    const h = harness([row('Only')]);
    h.createFailures.set('Only', new Error('only insert failed'));

    await h.run();

    assert.equal(h.reported.length, 1);
    assert.equal(
      (h.reported[0] as Error).message,
      'Content import failed to write all 1 attempted post.',
    );
  });

  it('fails a malformed row on its own and imports the rest', async function () {
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
      status: 'failed',
      reason: 'title is required',
    });
    assert.deepEqual(
      run?.rows.map((r) => r.status),
      ['created', 'failed', 'created'],
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
      status: 'failed',
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
      status: 'failed',
      reason: 'html could not be cleaned',
    });
  });

  it('completes without an internal error when every row fails validation before a write', async function () {
    const h = harness([
      { title: '', html: '<p>No title</p>', markdown: '', published_at: undefined },
      { title: '', html: '<p>Still no title</p>', markdown: '', published_at: undefined },
    ]);

    await h.run();

    assert.deepEqual(h.reported, []);
    assert.equal(h.store.get('run_test')?.status, 'complete');
    assert.deepEqual(
      h.store.get('run_test')?.rows.map((outcome) => outcome.status),
      ['failed', 'failed'],
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

  it('records relation warnings on successful row outcomes', async function () {
    const h = harness([row('Owner fallback')]);
    h.warningsByTitle.set('Owner fallback', [
      'Author "Missing Author" has no email; assigned Owner instead.',
    ]);

    await h.run();

    assert.deepEqual(h.store.get('run_test')?.rows[0], {
      line: 2,
      title: 'Owner fallback',
      status: 'created',
      postId: 'post_1',
      url: 'https://example.com/post_1/',
      warnings: ['Author "Missing Author" has no email; assigned Owner instead.'],
    });
  });

  it('keeps a successfully written post when its URL cannot be resolved', async function () {
    const h = harness();
    h.updatedTitles.add('First');
    h.urlFailures.set('post_1', new Error('URL service unavailable'));

    await h.run();

    assert.equal(h.created.length, 2);
    assert.deepEqual(h.store.get('run_test')?.rows, [
      { line: 2, title: 'First', status: 'updated', postId: 'post_1' },
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
      'Content import could not resolve a URL for 1 imported post.',
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
      'Content import could not resolve a URL for 2 imported posts.',
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
