import { importFiles } from '../../../../../utils/csv-import-files';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import ContentCSVImporter from '../../../../../../core/server/services/content-import/import/importer';
import { MediaInliningFailure } from '../../../../../../core/server/services/content-import/import/media';
import { Readable } from 'node:stream';
import errors from '@tryghost/errors';
import {
  ImportJournal,
  readJournalPosition,
  readOutcomeParts,
  type JournalStorage,
} from '../../../../../../core/server/services/content-import/import/journal';
import type { ImportSummary } from '../../../../../../core/server/services/content-import/import/summary';
import type { ImportReportContents } from '../../../../../../core/server/services/content-import/import/journal-report';
import type { PreparedPostRows } from '../../../../../../core/server/services/content-import/import/reader';
import type { PostImportRow } from '../../../../../../core/server/services/content-import/import/row';
import type { PostData } from '../../../../../../core/server/services/content-import/import/post-data';
import type { PostWriteMetadata } from '../../../../../../core/server/services/content-import/import/post-repository';
import type { RowOutcome } from '../../../../../../core/server/services/content-import/import/store';
import ContentCSVImportJob from '../../../../../../core/server/services/content-import/jobs/content-csv-import-job';

const row = (title: string, html = `<p>${title}</p>`): PostImportRow => ({
  title,
  html,
  markdown: '',
  published_at: '2025-01-01T00:00:00.000Z',
});

function preparedRows(
  rows: PostImportRow[],
  source?: { columns: string[]; rows: Array<Record<string, string>>; lines?: number[] },
): PreparedPostRows {
  return {
    columns: source?.columns ?? [],
    rows: (async function* () {
      for (const [index, data] of rows.entries()) {
        yield { data, source: source?.rows[index], line: source?.lines?.[index] ?? index + 2 };
      }
    })(),
    close: async () => {},
  };
}

// Collaborators are handed back as `deps` so a test can repoint the seam it is breaking.
function harness(
  rows: PostImportRow[] = [row('First'), row('Second')],
  source?: { columns: string[]; rows: Array<Record<string, string>>; lines?: number[] },
) {
  const created: Array<{ data: PostData; options: object; metadata?: PostWriteMetadata }> = [];
  const reported: unknown[] = [];
  const jobs: ContentCSVImportJob[] = [];
  const stagedFiles: Array<{ key: string; name: string }> = [];
  const removedFiles: Array<{ key: string; name: string }> = [];
  const downloadCleanup = sinon.stub().resolves();
  const createFailures = new Map<string, unknown>();
  const duplicateSlugs = new Set<string>();
  const updatedTitles = new Set<string>();
  const warningsByTitle = new Map<string, string[]>();
  const urlFailures = new Map<string, unknown>();
  const inlineMedia = sinon.stub().resolves();
  const createMediaInliner = sinon
    .stub()
    .callsFake(() => ({ inline: inlineMedia, close: sinon.stub().resolves() }));
  const files = new Map<string, Buffer>();
  const storage: JournalStorage = {
    async readStream({ path }) {
      const file = files.get(path);
      if (!file) {
        throw new errors.NotFoundError();
      }
      return Readable.from([file]);
    },
    async writeStream(key, input) {
      const buffers: Buffer[] = [];
      for await (const chunk of input) {
        buffers.push(Buffer.from(chunk));
      }
      files.set(key, Buffer.concat(buffers));
    },
    async replaceMetadata(key, bytes) {
      files.set(key, bytes);
    },
  };
  const sentRuns: Array<ImportSummary & { rows: RowOutcome[]; reports: ImportReportContents }> = [];
  const sentRecipients: string[] = [];
  const sendEmail = sinon
    .stub()
    .callsFake(async (run: ImportSummary, recipient: string, reports: ImportReportContents) => {
      const outcomes: RowOutcome[] = [];
      for await (const outcome of readOutcomeParts(storage, await readJournalPosition(storage))) {
        outcomes.push(outcome);
      }
      sentRuns.push({ ...run, rows: outcomes, reports });
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
    files: { ...importFiles, getSize: async () => 0 },
    readRows: async () => preparedRows(rows, source),
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
    dispatchJob: async (job: ContentCSVImportJob) => {
      jobs.push(job);
    },
    fileStager: {
      stage: async ({ fileName }: { fileName: string }) => {
        const file = { key: `staged-${stagedFiles.length + 1}`, name: fileName };
        stagedFiles.push(file);
        return file;
      },
      download: async (file: { key: string; name: string }) => ({
        path: `/tmp/downloaded-${file.key}`,
        cleanup: downloadCleanup,
      }),
      artifacts: () => storage,
      clearArtifacts: async () => {
        files.clear();
      },
      begin: async () => {},
      acknowledge: async () => {},
      start: async () => {},
      cleanupExpired: async () => {},
      cancel: async () => {},
      lookup: async () => ({ status: 'accepted' as const }),
      claim: async () => true,
      remove: async (_id: string, file: { key: string; name: string }) => {
        removedFiles.push(file);
      },
    },
    report: (error: unknown) => {
      reported.push(error);
    },
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
    trackLocalJobs: true,
  };

  const importer = new ContentCSVImporter(deps);

  // The dispatched job is invoked directly rather than through the jobs backend.
  const run = async () => {
    const accepted = await importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
    });
    for (const job of jobs) {
      await importer.handle(job);
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
    stagedFiles,
    removedFiles,
    downloadCleanup,
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
    files,
    sentRecipients,
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

  it('accepts the upload without counting rows and dispatches one serializable job', async function () {
    const h = harness();

    const accepted = await h.importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
    });

    assert.deepEqual(accepted, { importId: 'run_test' });
    assert.equal(h.jobs.length, 1);
    assert.equal(h.jobs[0].constructor, ContentCSVImportJob);
    assert.equal(ContentCSVImportJob.replayAfterRestart, true);
    const serialized = JSON.parse(JSON.stringify(h.jobs[0]));
    assert.deepEqual(serialized, {
      importId: 'run_test',
      file: { key: 'staged-1', name: 'posts.csv' },
      importTagNames: ['#Import 2026-01-01 11:30', '#Import Run run_test'],
      emailRecipient: 'owner@example.com',
    });
    assert.deepEqual(JSON.parse(JSON.stringify(new ContentCSVImportJob(serialized))), serialized);
    assert.equal(h.created.length, 0, 'nothing is written until the job runs');
    sinon.assert.notCalled(h.sendEmail);
  });

  it('runs a job dispatched by another process', async function () {
    const upload = harness();
    await upload.importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    const h = harness();

    await h.importer.handle(new ContentCSVImportJob(JSON.parse(JSON.stringify(upload.jobs[0]))));

    assert.equal(h.created.length, 2);
    assert.equal(h.sentRuns[0].status, 'complete');
    assert.equal(h.sentRuns[0].total, 2);
    sinon.assert.calledWith(h.sendEmail, sinon.match.object, 'owner@example.com');
  });

  it('logs when the class-based job is queued', async function () {
    const h = harness();

    await h.run();

    sinon.assert.calledWithExactly(infoLog, '[Background Job] content-csv-import queued');
    assert.deepEqual(h.removedFiles, [{ key: 'staged-1', name: 'posts.csv' }]);
  });

  it('settles only after the dispatched import has finished reporting and cleanup', async function () {
    const h = harness();
    await h.importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    let settled = false;
    const waiting = h.importer.allSettled().then(() => {
      settled = true;
    });

    await Promise.resolve();
    assert.equal(settled, false);

    await h.importer.handle(h.jobs[0]);
    await waiting;
    assert.equal(settled, true);
  });

  it('does not retain pending jobs in a production importer when another worker can deliver them', async function () {
    const h = harness();
    const importer = new ContentCSVImporter({ ...h.deps, trackLocalJobs: false });
    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await importer.allSettled();
    assert.equal(h.jobs.length, 1);
    assert.equal(h.created.length, 0);
  });

  it('returns the accepted receipt if another confirmation wins the upload lock', async function () {
    const h = harness();
    const importer = new ContentCSVImporter({
      ...h.deps,
      fileStager: {
        ...h.deps.fileStager,
        lookup: async () => ({ status: 'ready', file: { key: 'staged', name: 'posts.csv' } }),
        claim: async () => false,
      },
    });
    assert.deepEqual(await importer.confirmCSV('run_test', { type: 'user', id: 'staff' }), {
      importId: 'run_test',
    });
    assert.equal(h.jobs.length, 0);
  });

  it('retains an uncertain staged confirmation and does not try a second dispatch', async function () {
    const h = harness();
    const dispatchJob = sinon.stub().rejects(new Error('lost queue response'));
    const importer = new ContentCSVImporter({
      ...h.deps,
      dispatchJob,
      fileStager: {
        ...h.deps.fileStager,
        lookup: async () => ({ status: 'ready', file: { key: 'staged', name: 'posts.csv' } }),
      },
    });
    await assert.rejects(importer.confirmCSV('run_test', { type: 'user', id: 'staff' }), {
      code: 'CSV_IMPORT_SUBMISSION_UNCERTAIN',
    });
    await importer.allSettled();
    sinon.assert.calledOnce(dispatchJob);
    assert.deepEqual(h.removedFiles, []);
  });

  it('keeps original source columns and cells in the actionable error report', async function () {
    const h = harness([row('')], {
      columns: ['Headline', 'Body', 'Ignored'],
      rows: [{ Headline: 'Mapped title', Body: '<p>Source body</p>', Ignored: 'kept' }],
    });

    await h.run();

    assert.equal(
      h.sentRuns[0].reports.errorsFile,
      'import_status,import_reason,import_media_failures,Headline,Body,Ignored\r\nfailed,title is required,,Mapped title,<p>Source body</p>,kept',
    );
  });

  it('records the original spreadsheet line after an ignored empty row', async function () {
    const h = harness(
      [
        row('Before blank'),
        { title: '', html: '<p>No title</p>', markdown: '', published_at: undefined },
      ],
      {
        columns: ['title', 'html'],
        rows: [
          { title: 'Before blank', html: '<p>First</p>' },
          { title: '', html: '<p>No title</p>' },
        ],
        lines: [2, 4],
      },
    );

    await h.run();

    assert.deepEqual(
      h.sentRuns.at(-1)?.rows.map(({ line }) => line),
      [2, 4],
    );
  });

  it('emails the requesting user once after completing and releases the run', async function () {
    const h = harness();

    await h.importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
      requestUserEmail: 'requester@example.com',
    });
    await h.importer.handle(h.jobs[0]);

    sinon.assert.notCalled(h.getDefaultRecipient);
    sinon.assert.calledOnce(h.sendEmail);
    assert.deepEqual(h.sentRecipients, ['requester@example.com']);
    assert.equal(h.sentRuns[0].status, 'complete');
    await h.importer.allSettled();
  });

  it('falls back to Owner and reports email delivery failures without failing the run', async function () {
    const h = harness();
    const failure = new Error('mail unavailable');
    h.sendEmail.rejects(failure);

    await h.run();

    sinon.assert.calledOnce(h.getDefaultRecipient);
    sinon.assert.calledWith(h.sendEmail, sinon.match({ status: 'complete' }), 'owner@example.com');
    assert.equal(h.reported.at(-1), failure);
    await h.importer.allSettled();
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
      (thrown) => thrown === failure,
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
    await h.importer.allSettled();
  });

  it('recreates reporting state when a worker did not see the upload request', async function () {
    const h = harness();

    await h.importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await new ContentCSVImporter(h.deps).handle(h.jobs[0]);

    sinon.assert.calledOnce(h.sendEmail);
    assert.equal(h.sentRuns[0].rows.length, 2);
    assert.equal(h.created.length, 2);
  });

  it('uses the current time by default when one is not injected', async function () {
    const h = harness([row('Default clock')]);
    const { now: _now, ...deps } = h.deps;
    const importer = new ContentCSVImporter(deps);

    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await importer.handle(h.jobs[0]);

    assert.match(h.jobs[0].importTagNames[0], /^#Import \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it.each(['posts.csv', 'posts.zip'])(
    'resumes a deserialized %s job after committed records with the same run tags',
    async function (fileName) {
      const h = harness(
        [row('Committed'), row('Failed'), row('Replay duplicate'), row('Remaining')],
        {
          columns: ['title'],
          rows: [
            { title: 'Committed' },
            { title: 'Failed' },
            { title: 'Replay duplicate' },
            { title: 'Remaining' },
          ],
          lines: [2, 4, 5, 6],
        },
      );
      const { importId } = await h.importer.importCSV({ filePath: '/tmp/upload', fileName });
      const storage = h.deps.fileStager.artifacts();
      const journal = new ImportJournal(storage, ['title'], { record: 0, part: 0 });
      await journal.append({ line: 2, title: 'Committed', status: 'created' });
      await journal.append({
        line: 4,
        title: 'Failed',
        status: 'failed',
        source: { title: 'Failed' },
      });
      await journal.flush();
      h.duplicateSlugs.add('replay-duplicate');

      const replayedJob = new ContentCSVImportJob(JSON.parse(JSON.stringify(h.jobs[0])));
      await new ContentCSVImporter(h.deps).handle(replayedJob);

      assert.deepEqual(
        h.created.map(({ data }) => data.title),
        ['Remaining'],
      );
      assert.equal(h.created[0].metadata?.runTagName, `#Import Run ${importId}`);
      assert.deepEqual(
        h.sentRuns[0].rows.map(({ line, status }) => [line, status]),
        [
          [2, 'created'],
          [4, 'failed'],
          [5, 'skipped'],
          [6, 'created'],
        ],
      );
      assert.match(h.sentRuns[0].reports.errorsFile ?? '', /failed,,,Failed/);
    },
  );

  it('keeps lifecycle logging best-effort', async function () {
    const h = harness();
    infoLog.throws(new Error('Logging unavailable'));

    const accepted = await h.run();

    assert.deepEqual(accepted, { importId: 'run_test' });
    assert.equal(h.jobs.length, 1, 'the job is queued even when the queued log fails');
    assert.equal(
      h.sentRuns.at(-1)?.status,
      'complete',
      'the job still resolves and finalizes its run',
    );
    assert.equal(h.created.length, 2);
  });

  it('passes a caller-supplied mapping to the CSV reader', async function () {
    const h = harness();
    const receivedMappings: Array<Record<string, string> | undefined> = [];
    const importer = new ContentCSVImporter({
      ...h.deps,
      readRows: async (_path, mapping) => {
        receivedMappings.push(mapping);
        return preparedRows([row('Mapped')]);
      },
    });

    await importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
      mapping: { Headline: 'title' },
    });
    await importer.handle(h.jobs[0]);

    assert.deepEqual(receivedMappings, [{ Headline: 'title' }, { Headline: 'title' }]);
    assert.deepEqual(h.jobs[0].mapping, { Headline: 'title' });
  });

  it('reads the upload in the request and a download of the staged copy in the job', async function () {
    const h = harness();
    const readPaths: string[] = [];
    const importer = new ContentCSVImporter({
      ...h.deps,
      readRows: async (filePath) => {
        readPaths.push(filePath);
        return preparedRows([row('First')]);
      },
    });

    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await importer.handle(h.jobs[0]);

    assert.deepEqual(readPaths, ['/tmp/posts.csv', '/tmp/downloaded-staged-1']);
    assert.equal(h.created.length, 1);
    sinon.assert.calledOnce(h.downloadCleanup);
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
        return preparedRows([row('Prepared')]);
      },
    });

    await importer.importCSV({ filePath: '/tmp/upload', fileName: 'posts.zip' });

    assert.equal(receivedPath, '/tmp/extracted/posts.csv');
    sinon.assert.calledOnce(cleanup);
    await importer.handle(h.jobs[0]);
    sinon.assert.calledTwice(cleanup);
  });

  it('stores and rewrites assets before converting the row', async function () {
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
    await importer.handle(h.jobs[0]);

    assert.deepEqual(events.slice(0, 4), ['store', 'convert', 'rewrite', 'inline']);
    assert.match(h.created[0].data.lexical ?? '', /unique\.jpg/);
    sinon.assert.calledTwice(cleanup);
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
    await importer.handle(h.jobs[0]);

    assert.equal(h.converterResolutions(), 0);
    assert.equal(h.created.length, 0);
    assert.equal(h.sentRuns.at(-1)?.status, 'failed');
    assert.equal(h.sentRuns.at(-1)?.failureReason, 'storage unavailable');
    assert.deepEqual(h.reported, [failure]);
    sinon.assert.notCalled(rewriteRows);
    sinon.assert.calledTwice(cleanup);
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
    await importer.handle(h.jobs[0]);

    assert.deepEqual(events, ['convert', 'inline', 'write']);
  });

  it('creates an isolated media inliner for every import run', async function () {
    const h = harness([row('Cached media')]);

    await h.importer.importCSV({ filePath: '/tmp/first.csv', fileName: 'first.csv' });
    await h.importer.handle(h.jobs[0]);
    await h.importer.importCSV({ filePath: '/tmp/second.csv', fileName: 'second.csv' });
    await h.importer.handle(h.jobs[1]);

    sinon.assert.calledTwice(h.createMediaInliner);
    sinon.assert.calledOnce(h.createMediaInliner.firstCall.returnValue.close);
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
    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.deepEqual(h.sentRuns.at(-1)?.rows[1], {
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
    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.deepEqual(
      h.sentRuns.at(-1)?.rows.map((outcome) => outcome.status),
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
    sinon.assert.calledOnce(h.createMediaInliner.firstCall.returnValue.close);
    assert.deepEqual(h.reported, [failure]);
    assert.equal(h.sentRuns.at(-1)?.status, 'failed');
    assert.equal(h.sentRuns.at(-1)?.failureReason, failure.message);
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
    assert.deepEqual(h.stagedFiles, []);
  });

  it('rejects an oversized upload before opening or staging it', async function () {
    const h = harness();
    const readRows = sinon.stub();
    const importer = new ContentCSVImporter({
      ...h.deps,
      files: { ...h.deps.files, getSize: async () => 1024 ** 3 + 1 },
      readRows,
    });

    await assert.rejects(
      importer.importCSV({ filePath: '/tmp/posts.zip', fileName: 'posts.zip' }),
      {
        errorType: 'UnsupportedMediaTypeError',
      },
    );
    sinon.assert.notCalled(readRows);
    assert.deepEqual(h.stagedFiles, []);
  });

  it('rejects with the storage error when a valid upload cannot be staged', async function () {
    const h = harness();
    const failure = new Error('storage unavailable');
    const importer = new ContentCSVImporter({
      ...h.deps,
      fileStager: {
        ...h.deps.fileStager,
        stage: async () => {
          throw failure;
        },
      },
    });

    await assert.rejects(
      importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' }),
      (thrown) => thrown === failure,
    );

    assert.equal(h.jobs.length, 0);
    assert.equal(h.sentRuns.at(-1), undefined);
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

  it('imports all rows from a ZIP above the former cap', async function () {
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

    const accepted = await importer.importCSV({
      filePath: '/tmp/posts.zip',
      fileName: 'posts.zip',
    });
    assert.deepEqual(accepted, { importId: 'run_test' });
    assert.equal(h.jobs.length, 1);
    sinon.assert.notCalled(storeAssets);
    sinon.assert.calledOnce(cleanup);

    await importer.handle(h.jobs[0]);

    assert.equal(h.created.length, 101);
    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.equal(h.sentRuns.at(-1)?.rows.length, 101);
    sinon.assert.calledOnce(storeAssets);
    sinon.assert.calledTwice(cleanup);
    assert.deepEqual(h.removedFiles, [{ key: 'staged-1', name: 'posts.zip' }]);
  });

  it('fails and emails the run if the staged file cannot be reparsed by the job', async function () {
    const h = harness();
    let readCount = 0;
    const importer = new ContentCSVImporter({
      ...h.deps,
      readRows: async () => {
        readCount += 1;
        if (readCount === 2) {
          throw new Error('staged file unavailable');
        }
        return preparedRows([row('Preflight')]);
      },
    });

    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await importer.handle(h.jobs[0]);

    assert.equal(h.sentRuns.at(-1)?.status, 'failed');
    assert.match(h.sentRuns.at(-1)?.failureReason ?? '', /could not be parsed as a CSV/);
    sinon.assert.calledWith(h.sendEmail, sinon.match({ status: 'failed' }), 'owner@example.com');
    sinon.assert.calledOnce(h.downloadCleanup);
    assert.deepEqual(h.removedFiles, [{ key: 'staged-1', name: 'posts.csv' }]);
  });

  it('fails and emails the run if the staged upload cannot be downloaded', async function () {
    const h = harness();
    const failure = new Error('storage unavailable');
    const importer = new ContentCSVImporter({
      ...h.deps,
      fileStager: {
        ...h.deps.fileStager,
        download: async () => {
          throw failure;
        },
      },
    });

    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await importer.handle(h.jobs[0]);

    assert.deepEqual(h.reported, [failure]);
    sinon.assert.calledWith(
      h.sendEmail,
      sinon.match({ status: 'failed', failureReason: 'storage unavailable' }),
      'owner@example.com',
    );
    assert.deepEqual(h.removedFiles, [{ key: 'staged-1', name: 'posts.csv' }]);
  });

  it('cleans the prepared source but retains the upload if dispatch fails', async function () {
    const h = harness();
    const cleanup = sinon.stub().resolves();
    const importer = new ContentCSVImporter({
      ...h.deps,
      prepareSource: async () => ({ filePath: '/tmp/extracted/posts.csv', cleanup }),
      dispatchJob: async () => {
        throw new Error('queue unavailable');
      },
    });

    await assert.rejects(
      importer.importCSV({ filePath: '/tmp/posts.zip', fileName: 'posts.zip' }),
      /queue unavailable/,
    );
    assert.equal(h.sentRuns.length, 0);
    sinon.assert.calledOnce(cleanup);
    sinon.assert.notCalled(h.sendEmail);
    await h.importer.allSettled();
    assert.deepEqual(h.removedFiles, []);
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
    await importer.handle(h.jobs[0]);

    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.deepEqual(h.reported, [cleanupError, cleanupError]);
  });

  it('reports a staged-file cleanup failure without rejecting the completed job', async function () {
    const h = harness();
    const cleanupError = new Error('staged cleanup failed');
    const importer = new ContentCSVImporter({
      ...h.deps,
      fileStager: {
        ...h.deps.fileStager,
        remove: async () => {
          throw cleanupError;
        },
      },
    });

    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    await importer.handle(h.jobs[0]);

    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.deepEqual(h.reported, [cleanupError]);
  });

  it('reports a download cleanup failure without rejecting the completed job', async function () {
    const h = harness();
    const cleanupError = new Error('download cleanup failed');
    h.downloadCleanup.rejects(cleanupError);

    await h.run();

    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.deepEqual(h.reported, [cleanupError]);
  });

  it.each([99, 100, 101])('imports all %i rows from a raw CSV', async function (total) {
    const h = harness(Array.from({ length: total }, (_, i) => row(`Post ${i + 1}`)));

    const accepted = await h.importer.importCSV({
      filePath: '/tmp/posts.csv',
      fileName: 'posts.csv',
    });

    assert.deepEqual(accepted, { importId: 'run_test' });
    assert.equal(h.jobs.length, 1);

    await h.importer.handle(h.jobs[0]);

    assert.equal(h.created.length, total);
    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.equal(h.sentRuns.at(-1)?.rows.length, total);
  });

  it('finishes each post write before pulling another record', async function () {
    const h = harness();
    let pulled = 0;
    let resumeWrite!: () => void;
    const blocked = new Promise<void>((resolve) => {
      resumeWrite = resolve;
    });
    let markWriting!: () => void;
    const writing = new Promise<void>((resolve) => {
      markWriting = resolve;
    });
    const importer = new ContentCSVImporter({
      ...h.deps,
      readRows: async () => ({
        columns: ['title'],
        close: async () => {},
        rows: (async function* () {
          for (let index = 1; index <= 1000; index++) {
            pulled += 1;
            yield { data: row(`Row ${index}`), line: index + 1 };
          }
        })(),
      }),
      posts: {
        write: async (...args) => {
          if (pulled === 1) {
            markWriting();
            await blocked;
          }
          return h.deps.posts.write(...args);
        },
      },
    });
    await importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    assert.equal(pulled, 0);
    const job = importer.handle(h.jobs[0]);
    await writing;
    assert.equal(pulled, 1);
    resumeWrite();
    await job;
    assert.equal(pulled, 1000);
    assert.equal(h.sentRuns.at(-1)?.total, 1000);
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

    const run = h.sentRuns.at(-1);
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
    assert.deepEqual(h.sentRuns.at(-1)?.rows, [
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
        postType: 'post',
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
    assert.deepEqual(h.sentRuns.at(-1)?.rows, [
      {
        line: 2,
        title: 'Updated',
        status: 'updated',
        postId: 'post_1',
        postType: 'post',
        url: 'https://example.com/post_1/',
      },
    ]);
  });

  it('records a failed update against its row and continues importing', async function () {
    const h = harness([row('Update failure'), row('Created')]);
    h.updatedTitles.add('Update failure');
    h.createFailures.set('Update failure', new Error('update failed'));

    await h.run();

    assert.deepEqual(h.sentRuns.at(-1)?.rows[0], {
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
      h.sentRuns.at(-1)?.rows.map((outcome) => outcome.status),
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
    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.deepEqual(
      h.sentRuns.at(-1)?.rows.map((outcome) => outcome.status),
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

    const run = h.sentRuns.at(-1);
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
    assert.deepEqual(h.sentRuns.at(-1)?.rows[1], {
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
    assert.deepEqual(h.sentRuns.at(-1)?.rows[1], {
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
    assert.equal(h.sentRuns.at(-1)?.status, 'complete');
    assert.deepEqual(
      h.sentRuns.at(-1)?.rows.map((outcome) => outcome.status),
      ['failed', 'failed'],
    );
  });

  it('reports a terminal failure and resolves the job without retry', async function () {
    const h = harness();
    const failure = new Error('converter unavailable');
    h.setHtmlToLexicalFactory(() => {
      throw failure;
    });

    await h.run();

    assert.deepEqual(h.reported, [failure]);
    assert.equal(h.sentRuns.at(-1)?.status, 'failed');
    assert.equal(h.sentRuns.at(-1)?.failureReason, 'converter unavailable');
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
    assert.equal(h.sentRuns.at(-1)?.status, 'failed');
    assert.equal(h.sentRuns.at(-1)?.failureReason, 'unexpected row failure');
  });

  it('finalizes a previously marked partial run without processing more posts', async function () {
    const h = harness([row('Committed'), row('Never processed')]);
    await h.importer.importCSV({ filePath: '/tmp/posts.csv', fileName: 'posts.csv' });
    const storage = h.deps.fileStager.artifacts();
    const journal = new ImportJournal(storage, [], { record: 0, part: 0 });
    await journal.append({ line: 2, title: 'Committed', status: 'created' });
    await journal.flush();
    await storage.replaceMetadata('failure.txt', Buffer.from('Processing failed'));

    await h.importer.handle(h.jobs[0]);

    assert.equal(h.created.length, 0);
    assert.equal(h.sentRuns[0].status, 'failed');
    assert.equal(h.sentRuns[0].total, 1);
    assert.equal(h.sentRuns[0].failureReason, 'Processing failed');
    assert.equal(h.files.size, 0);
  });

  it('uses a safe reason when a run-level failure has no message', async function () {
    const h = harness();
    h.setHtmlToLexicalFactory(() => {
      throw {};
    });

    await h.run();

    assert.equal(h.reported.length, 1);
    assert.equal(h.sentRuns.at(-1)?.status, 'failed');
    assert.equal(h.sentRuns.at(-1)?.failureReason, 'Unknown error');
  });

  it('records relation warnings on successful row outcomes', async function () {
    const h = harness([row('Owner fallback')]);
    h.warningsByTitle.set('Owner fallback', [
      'Author "Missing Author" has no email; assigned Owner instead.',
    ]);

    await h.run();

    assert.deepEqual(h.sentRuns.at(-1)?.rows[0], {
      line: 2,
      title: 'Owner fallback',
      status: 'created',
      postId: 'post_1',
      postType: 'post',
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
    assert.deepEqual(h.sentRuns.at(-1)?.rows, [
      {
        line: 2,
        title: 'First',
        status: 'updated',
        postId: 'post_1',
        postType: 'post',
      },
      {
        line: 3,
        title: 'Second',
        status: 'created',
        postId: 'post_2',
        postType: 'post',
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
      h.sentRuns.at(-1)?.rows.map((outcome) => outcome.status),
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

  it('records a created outcome per row with its id, type and URL', async function () {
    const h = harness([row('First'), { ...row('Second'), type: 'page' }]);

    await h.run();

    const run = h.sentRuns.at(-1);
    assert.equal(run?.status, 'complete');
    assert.equal(run?.total, 2);
    assert.deepEqual(run?.rows, [
      {
        line: 2,
        title: 'First',
        status: 'created',
        postId: 'post_1',
        postType: 'post',
        url: 'https://example.com/post_1/',
      },
      {
        line: 3,
        title: 'Second',
        status: 'created',
        postId: 'post_2',
        postType: 'page',
        url: 'https://example.com/post_2/',
      },
    ]);
  });
});
