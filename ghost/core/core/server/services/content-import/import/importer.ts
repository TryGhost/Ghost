import moment from 'moment-timezone';
import buildPostData, {
  RowSkipped,
  type CleanHTML,
  type HtmlToLexical,
  type MarkdownToHtml,
  type PostData,
} from './post-data';
import type { PostImportRow } from './row';
import type { PostsRepository, WrittenPost } from './post-repository';
import type { ImportRequest } from './schema';
import type { Clock, ImportRun, ImportRunStore, RowOutcome } from './store';
import type { PreparedImportSource } from './source';
import { MediaInliningFailure, type PostMediaInlining } from './media';

export type { ImportRequest } from './schema';

const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

// The CSV is parsed inside the request (the uploaded temp file is deleted when the
// response is sent); the parsed rows are handed to an in-process background job
// that writes one post per row.

// The id is what a completion report will be looked up by.
export interface ImportAccepted {
  importId: string;
  total: number;
}

// Must not throw: it is called from catch blocks that exist to stop an error escaping.
export type FailureReporter = (error: unknown) => void;

export interface EmailNotifications {
  send(run: ImportRun, recipient: string): Promise<unknown>;
  getDefaultRecipient(): Promise<string>;
}

type ReadRows = (path: string, mapping?: Record<string, string>) => Promise<PostImportRow[]>;
type PrepareSource = (request: ImportRequest) => Promise<PreparedImportSource>;

const messages = {
  unreadableFile: 'The file could not be parsed as a CSV file.',
  tooManyPosts:
    'This file contains more than {max} posts. Imports are temporarily limited to {max} posts at a time — please split the file into smaller files and try again.',
  allWritesFailed: 'Content import failed to write all {count} attempted {postNoun}.',
  urlResolutionFailed: 'Content import could not resolve a URL for {count} imported {postNoun}.',
};

function logLifecycle(message: string): void {
  try {
    logging.info(`[Background Job] content-import ${message}`);
  } catch {
    // Observability must not change whether an import is queued or resolves.
  }
}

const MAX_POSTS = 100;

interface ImporterDeps {
  readRows: ReadRows;
  prepareSource?: PrepareSource;
  posts: PostsRepository;
  // A getter so the heavy html->lexical require resolves once per run
  getHtmlToLexical: () => HtmlToLexical;
  getMarkdownToHtml: () => MarkdownToHtml;
  getCleanHTML: () => CleanHTML;
  createMediaInliner: () => PostMediaInlining;
  email: EmailNotifications;
  addJob: (job: { job: () => Promise<void>; offloaded: boolean; name: string }) => void;
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
  private _readRows: ReadRows;
  private _prepareSource: PrepareSource;
  private _posts: PostsRepository;
  private _getHtmlToLexical: () => HtmlToLexical;
  private _getMarkdownToHtml: () => MarkdownToHtml;
  private _getCleanHTML: () => CleanHTML;
  private _createMediaInliner: () => PostMediaInlining;
  private _email: EmailNotifications;
  private _addJob: ImporterDeps['addJob'];
  private _report: FailureReporter;
  private _store: ImportRunStore;
  private _urlForPost: (post: WrittenPost) => string;
  private _newRunId: () => string;
  private _getTimezone: () => string;
  private _now: Clock;

  constructor({
    readRows,
    prepareSource = async ({ filePath }) => ({ filePath, cleanup: async () => {} }),
    posts,
    getHtmlToLexical,
    getMarkdownToHtml,
    getCleanHTML,
    createMediaInliner,
    email,
    addJob,
    report,
    store,
    urlForPost,
    newRunId,
    getTimezone,
    now = () => new Date(),
  }: ImporterDeps) {
    this._readRows = readRows;
    this._prepareSource = prepareSource;
    this._posts = posts;
    this._getHtmlToLexical = getHtmlToLexical;
    this._getMarkdownToHtml = getMarkdownToHtml;
    this._getCleanHTML = getCleanHTML;
    this._createMediaInliner = createMediaInliner;
    this._email = email;
    this._addJob = addJob;
    this._report = report;
    this._store = store;
    this._urlForPost = urlForPost;
    this._newRunId = newRunId;
    this._getTimezone = getTimezone;
    this._now = now;
  }

  async importCSV(request: ImportRequest): Promise<ImportAccepted> {
    const emailRecipient = request.requestUserEmail ?? (await this._email.getDefaultRecipient());
    const source = await this._prepareSource(request);
    let rows: PostImportRow[];
    try {
      rows = await this._readRows(source.filePath, request.mapping);
    } catch (error) {
      await this.cleanupSource(source.cleanup);
      throw new errors.ValidationError({
        message: tpl(messages.unreadableFile),
        err: error,
      });
    }

    // Temporary while import state is held in memory: the durable job
    // system milestone removes the cap.
    if (rows.length > MAX_POSTS) {
      await this.cleanupSource(source.cleanup);
      throw new errors.ValidationError({
        message: tpl(messages.tooManyPosts, { max: MAX_POSTS }),
      });
    }

    const runId = this._newRunId();
    const importTagNames = buildImportTagNames(runId, this._getTimezone(), this._now());
    this._store.create(runId, rows.length);

    logLifecycle('queued');
    try {
      this._addJob({
        job: () => this.runImportJob(runId, importTagNames, rows, source, emailRecipient),
        offloaded: false,
        name: 'content-import',
      });
    } catch (error) {
      this._store.fail(runId, messageOf(error));
      await this.cleanupSource(source.cleanup);
      this._store.release(runId);
      throw error;
    }

    return { importId: runId, total: rows.length };
  }

  // Must resolve in every case: the job manager reads a rejected inline job as a
  // defect in the job itself, and there is no retry behind it.
  private async runImportJob(
    runId: string,
    importTagNames: string[],
    rows: PostImportRow[],
    source: PreparedImportSource,
    emailRecipient: string,
  ): Promise<void> {
    const startedAt = Date.now();
    logLifecycle('started');
    let urlFailureCount = 0;
    let firstUrlFailure: unknown;
    let failed = false;

    try {
      if (source.assets) {
        await source.assets.store();
        source.assets.rewriteRows(rows);
      }

      const htmlToLexical = this._getHtmlToLexical();
      const markdownToHtml = this._getMarkdownToHtml();
      const cleanHTML = this._getCleanHTML();
      const media = this._createMediaInliner();
      let successfulWrites = 0;
      let failedRows = 0;
      let firstRowFailure: unknown;

      for (const [index, row] of rows.entries()) {
        const line = index + 2;
        let data: PostData;

        try {
          data = buildPostData(row, htmlToLexical, importTagNames, markdownToHtml, cleanHTML);
        } catch (error) {
          if (error instanceof RowSkipped) {
            this._store.record(runId, {
              line,
              title: row.title || null,
              status: 'skipped',
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
            this._store.record(runId, {
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
              authorNames: row.authors,
              authorEmails: row.author_emails,
              tagNames: row.tags,
            },
          );

          if (result.status === 'skipped') {
            this._store.record(runId, {
              line,
              title: row.title,
              status: 'skipped',
              reason: result.reason,
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
          this._store.record(runId, {
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
        this._store.record(runId, outcome);
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
      failed = true;
      this.reportUrlFailures(urlFailureCount, firstUrlFailure);
      this._report(error);
      this._store.fail(runId, messageOf(error));
    } finally {
      await this.cleanupSource(source.cleanup);
      const run = this._store.get(runId);
      if (run) {
        await this.settle(() => this._email.send(run, emailRecipient));
      }
      this._store.release(runId);
      const outcome = failed ? 'failed after' : 'completed in';
      logLifecycle(`${outcome} ${Date.now() - startedAt}ms`);
    }
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
