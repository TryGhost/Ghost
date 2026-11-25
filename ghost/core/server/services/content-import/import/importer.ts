import moment from 'moment-timezone';
import buildPostData, {
  RowSkipped,
  type CleanHTML,
  type HtmlToLexical,
  type MarkdownToHtml,
  type PostData,
} from './post-data';
import type { PostsRepository, WrittenPost } from './post-repository';
import type { ImportRequest } from './schema';
import type { Clock, ImportRun, ImportRunStore, RowOutcome } from './store';
import type { PreparedImportSource } from './source';
import type { PreparedPostRow, PreparedPostRows } from './reader';
import { MediaInliningFailure, type PostMediaInlining } from './media';
import {
  uncertainSubmission,
  type ImportFileStager,
  type DownloadedImportFile,
  type StagedImportFile,
} from './staged-file';
import ContentCSVImportJob from '../jobs/content-csv-import-job';
import { readCSVPreview } from './preview';
import { assertCSVUploadSize } from './limits';
import type { ImportOwner } from './upload-repository';
import type { ImportFiles } from './files';

export type { ImportRequest } from './schema';

const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

// The upload is staged because the request temp file is deleted with the response.
// The request checks the source and header. The job parses the data rows so
// its payload stays serializable and acceptance does not depend on counting.

// The id is what a completion report will be looked up by.
export interface ImportAccepted {
  importId: string;
}

// Must not throw: it is called from catch blocks that exist to stop an error escaping.
export type FailureReporter = (error: unknown) => void;

export interface EmailNotifications {
  send(run: ImportRun, recipient: string): Promise<unknown>;
  getDefaultRecipient(): Promise<string>;
}

type ReadRows = (path: string, mapping?: Record<string, string>) => Promise<PreparedPostRows>;
type PrepareSource = (
  request: ImportRequest,
  options?: { includeAssets?: boolean },
) => Promise<PreparedImportSource>;

const messages = {
  unreadableFile: 'The file could not be parsed as a CSV file.',
  allWritesFailed: 'Content import failed to write all {count} attempted {postNoun}.',
  urlResolutionFailed: 'Content import could not resolve a URL for {count} imported {postNoun}.',
};

function logLifecycle(message: string): void {
  try {
    logging.info(`[Background Job] ${ContentCSVImportJob.type} ${message}`);
  } catch {
    // Observability must not change whether an import is queued or resolves.
  }
}

interface ImporterDeps {
  files: Pick<ImportFiles, 'readSource' | 'getSize'>;
  readRows: ReadRows;
  prepareSource?: PrepareSource;
  posts: PostsRepository;
  // A getter so the heavy html->lexical require resolves once per run
  getHtmlToLexical: () => HtmlToLexical;
  getMarkdownToHtml: () => MarkdownToHtml;
  getCleanHTML: () => CleanHTML;
  createMediaInliner: () => PostMediaInlining;
  email: EmailNotifications;
  dispatchJob: (job: ContentCSVImportJob) => Promise<void>;
  fileStager: ImportFileStager;
  report: FailureReporter;
  store: ImportRunStore;
  urlForPost: (post: WrittenPost) => string;
  newRunId: () => string;
  getTimezone: () => string;
  now?: Clock;
}

// Two batch tags for every imported post: a date stamp matching the JSON
// importer's (api/endpoints/db.js), and a run tag unique to this import, which
// the report milestones key on.
function buildImportTagNames(runId: string, timezone: string, now: Date): string[] {
  return [`#Import ${moment(now).tz(timezone).format('YYYY-MM-DD HH:mm')}`, `#Import Run ${runId}`];
}

class ContentCSVImporter {
  private _files: ImporterDeps['files'];
  private _readRows: ReadRows;
  private _prepareSource: PrepareSource;
  private _posts: PostsRepository;
  private _getHtmlToLexical: () => HtmlToLexical;
  private _getMarkdownToHtml: () => MarkdownToHtml;
  private _getCleanHTML: () => CleanHTML;
  private _createMediaInliner: () => PostMediaInlining;
  private _email: EmailNotifications;
  private _dispatchJob: ImporterDeps['dispatchJob'];
  private _fileStager: ImportFileStager;
  private _report: FailureReporter;
  private _store: ImportRunStore;
  private _urlForPost: (post: WrittenPost) => string;
  private _newRunId: () => string;
  private _getTimezone: () => string;
  private _now: Clock;

  constructor({
    files,
    readRows,
    prepareSource = async ({ filePath }) => ({ filePath, cleanup: async () => {} }),
    posts,
    getHtmlToLexical,
    getMarkdownToHtml,
    getCleanHTML,
    createMediaInliner,
    email,
    dispatchJob,
    fileStager,
    report,
    store,
    urlForPost,
    newRunId,
    getTimezone,
    now = () => new Date(),
  }: ImporterDeps) {
    this._files = files;
    this._readRows = readRows;
    this._prepareSource = prepareSource;
    this._posts = posts;
    this._getHtmlToLexical = getHtmlToLexical;
    this._getMarkdownToHtml = getMarkdownToHtml;
    this._getCleanHTML = getCleanHTML;
    this._createMediaInliner = createMediaInliner;
    this._email = email;
    this._dispatchJob = dispatchJob;
    this._fileStager = fileStager;
    this._report = report;
    this._store = store;
    this._urlForPost = urlForPost;
    this._newRunId = newRunId;
    this._getTimezone = getTimezone;
    this._now = now;
  }

  async importCSV(request: ImportRequest): Promise<ImportAccepted> {
    const bytes = await this._files.getSize(request.filePath).catch((error) => {
      throw new errors.ValidationError({ message: tpl(messages.unreadableFile), err: error });
    });
    assertCSVUploadSize(bytes);
    const emailRecipient = request.requestUserEmail ?? (await this._email.getDefaultRecipient());
    const runId = this._newRunId();
    const { source, preparedRows } = await this.readPreparedRows(request, false);
    await this.cleanupSource(preparedRows.close);
    await this.cleanupSource(source.cleanup);
    const stagedFile = await this._fileStager.stage(request, runId, this._now());
    let handedOff = false;

    try {
      await this._fileStager.begin(runId);
      // Enqueue can fail after acceptance (for example on a Redis timeout).
      // Keep the source until expiry or an actual delivery resolves uncertainty.
      handedOff = true;
      return await this.queueImport(runId, stagedFile, {
        mapping: request.mapping,
        emailRecipient,
      });
    } finally {
      if (!handedOff) {
        await this.cleanupStagedFile(runId, stagedFile);
      }
    }
  }

  async confirmCSV(
    id: string,
    owner: ImportOwner,
    mapping?: Record<string, string>,
    requestUserEmail?: string | null,
  ): Promise<ImportAccepted> {
    const selection = await this._fileStager.lookup(id, owner, this._now());
    if (selection.status === 'accepted') {
      return { importId: id };
    }

    const emailRecipient = requestUserEmail ?? (await this._email.getDefaultRecipient());
    const claimed = await this._fileStager.claim(id, owner, this._now());
    if (!claimed) {
      return { importId: id };
    }
    try {
      return await this.queueImport(id, selection.file, { mapping, emailRecipient });
    } catch (error) {
      throw uncertainSubmission(error);
    }
  }

  private async queueImport(
    id: string,
    file: StagedImportFile,
    {
      mapping,
      emailRecipient,
    }: {
      mapping?: Record<string, string>;
      emailRecipient: string;
    },
  ): Promise<ImportAccepted> {
    const importTagNames = buildImportTagNames(id, this._getTimezone(), this._now());
    const job = new ContentCSVImportJob({
      importId: id,
      file,
      mapping,
      importTagNames,
      emailRecipient,
    });
    logLifecycle('queued');
    await this._dispatchJob(job);
    await this._fileStager.acknowledge(id);
    return { importId: id };
  }

  async inspectCSV(request: ImportRequest) {
    assertCSVUploadSize(await this._files.getSize(request.filePath));
    const source = await this._prepareSource(request, { includeAssets: false });
    try {
      const sample = await readCSVPreview(this._files.readSource(source.filePath));
      const uploadId = this._newRunId();
      await this._fileStager.stage(request, uploadId, this._now());
      return { upload_id: uploadId, ...sample };
    } finally {
      await this.cleanupSource(source.cleanup);
    }
  }

  cancelUpload(id: string, owner: ImportOwner): Promise<void> {
    return this._fileStager.cancel(id, owner);
  }

  async handle(job: ContentCSVImportJob): Promise<void> {
    let source: PreparedImportSource | undefined;
    let preparedRows: PreparedPostRows | undefined;
    let materialized: DownloadedImportFile | undefined;
    let started = false;

    try {
      await this._fileStager.start(job.importId, this._now());
      started = true;
      const run = this._store.create(job.importId, 0);
      materialized = await this._fileStager.download(job.file);
      const prepared = await this.readPreparedRows({
        filePath: materialized.path,
        fileName: job.file.name,
        mapping: job.mapping,
      });
      source = prepared.source;
      preparedRows = prepared.preparedRows;
      run.sourceColumns = preparedRows.columns;
      await this.processRows(job.importId, job.importTagNames, preparedRows.rows, prepared.source);
    } catch (error) {
      if (started && !this._store.get(job.importId)) {
        this._store.create(job.importId, 0);
      }
      this._store.fail(job.importId, messageOf(error));
      throw error;
    } finally {
      if (preparedRows) {
        await this.cleanupSource(preparedRows.close);
      }
      if (source) {
        await this.cleanupSource(source.cleanup);
      }
      if (materialized) {
        await this.cleanupSource(materialized.cleanup);
      }
      const run = this._store.get(job.importId);
      if (run) {
        await this.settle(() => this._email.send(run, job.emailRecipient));
      }
      if (started) {
        await this.cleanupStagedFile(job.importId, job.file);
      }
      this._store.release(job.importId);
    }
  }

  cleanupUploads(): Promise<void> {
    return this._fileStager.cleanupExpired(this._now(), this._report);
  }

  private async processRows(
    runId: string,
    importTagNames: string[],
    rows: AsyncIterable<PreparedPostRow>,
    source: PreparedImportSource,
  ): Promise<void> {
    let urlFailureCount = 0;
    let firstUrlFailure: unknown;
    let media: PostMediaInlining | undefined;

    try {
      if (source.assets) {
        await source.assets.store();
      }

      const htmlToLexical = this._getHtmlToLexical();
      const markdownToHtml = this._getMarkdownToHtml();
      const cleanHTML = this._getCleanHTML();
      media = this._createMediaInliner();
      let successfulWrites = 0;
      let failedRows = 0;
      let firstRowFailure: unknown;

      for await (const { data: row, source: sourceCells, line } of rows) {
        source.assets?.rewriteRows([row]);
        let data: PostData;

        try {
          data = buildPostData(row, htmlToLexical, importTagNames, markdownToHtml, cleanHTML);
        } catch (error) {
          if (error instanceof RowSkipped) {
            this.recordOutcome(runId, sourceCells, {
              line,
              title: row.title || null,
              status: 'failed',
              reason: messageOf(error),
            });
            continue;
          }

          // Anything other than an expected source-row refusal is an importer
          // failure. Stop the run before misclassifying it as a lost write.
          throw error;
        }

        try {
          await media.inline(data);
        } catch (error) {
          if (error instanceof MediaInliningFailure) {
            if (failedRows === 0) {
              firstRowFailure = error;
            }
            failedRows += 1;
            this.recordOutcome(runId, sourceCells, {
              line,
              title: row.title,
              status: 'failed',
              reason: messageOf(error),
              mediaFailures: error.failures,
            });
            continue;
          }

          throw error;
        }

        let post: WrittenPost;
        let writeStatus: 'created' | 'updated';
        let warnings: string[];
        try {
          // options.importing preserves the supplied timestamps and keeps the import silent:
          // the webhook, Slack, IndexNow and mention consumers all stand down on it, and a
          // newsletter can only be attached in the API layer (post-scheduling does not check
          // it, one reason status is never 'scheduled'). Pinned by
          // test/e2e-webhooks/posts-importer.test.js. A fresh options object per row: the
          // model layer mutates it.
          const result = await this._posts.write(
            data,
            {
              importing: true,
              context: { internal: true },
            },
            {
              sourceUpdatedAt: row.updated_at,
              runTagName: importTagNames[1],
              authorNames: row.authors,
              authorEmails: row.author_emails,
              tagNames: row.tags,
            },
          );

          if (result.status === 'skipped') {
            this.recordOutcome(runId, sourceCells, {
              line,
              title: row.title,
              status: 'skipped',
              reason: result.reason,
              duplicate: result.duplicate,
            });
            continue;
          }

          post = result.post;
          writeStatus = result.status;
          warnings = result.warnings;
          successfulWrites += 1;
        } catch (error) {
          if (failedRows === 0) {
            firstRowFailure = error;
          }
          failedRows += 1;
          this.recordOutcome(runId, sourceCells, {
            line,
            title: row.title,
            status: 'failed',
            reason: messageOf(error),
          });
          continue;
        }

        const outcome: RowOutcome = {
          line,
          title: row.title,
          status: writeStatus,
          postId: post.id,
          postType: data.type,
          ...(warnings.length > 0 ? { warnings } : {}),
        };
        try {
          outcome.url = this._urlForPost(post);
        } catch (error) {
          if (urlFailureCount === 0) {
            firstUrlFailure = error;
          }
          urlFailureCount += 1;
        }
        this.recordOutcome(runId, sourceCells, outcome);
      }

      if (failedRows > 0 && successfulWrites === 0) {
        this._report(
          new errors.InternalServerError({
            message: tpl(messages.allWritesFailed, {
              count: failedRows,
              postNoun: failedRows === 1 ? 'post' : 'posts',
            }),
            err: firstRowFailure,
          }),
        );
      }

      this.reportUrlFailures(urlFailureCount, firstUrlFailure);
      this._store.finish(runId);
    } catch (error) {
      this.reportUrlFailures(urlFailureCount, firstUrlFailure);
      throw error;
    } finally {
      await this.settle(async () => media?.close?.());
    }
  }

  private async readPreparedRows(
    request: ImportRequest,
    includeAssets = true,
  ): Promise<{ source: PreparedImportSource; preparedRows: PreparedPostRows }> {
    const source = await this._prepareSource(request, { includeAssets });
    try {
      const preparedRows = await this._readRows(source.filePath, request.mapping);
      return { source, preparedRows };
    } catch (error) {
      await this.cleanupSource(source.cleanup);
      throw new errors.ValidationError({
        message: tpl(messages.unreadableFile),
        err: error,
      });
    }
  }

  private recordOutcome(
    runId: string,
    source: Record<string, string> | undefined,
    outcome: RowOutcome,
  ): void {
    this._store.record(runId, source ? { ...outcome, source } : outcome);
  }

  private reportUrlFailures(count: number, firstFailure: unknown): void {
    if (count > 0) {
      this._report(
        new errors.InternalServerError({
          message: tpl(messages.urlResolutionFailed, {
            count,
            postNoun: count === 1 ? 'post' : 'posts',
          }),
          err: firstFailure,
        }),
      );
    }
  }

  private async cleanupSource(cleanup: () => Promise<void>): Promise<void> {
    try {
      await cleanup();
    } catch (error) {
      this._report(error);
    }
  }

  private async cleanupStagedFile(id: string, file: StagedImportFile): Promise<void> {
    try {
      await this._fileStager.remove(id, file);
    } catch (error) {
      this._report(error);
    }
  }

  private async settle(operation: () => Promise<unknown>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      this._report(error);
    }
  }
}

function messageOf(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }
  return 'Unknown error';
}

export default ContentCSVImporter;
