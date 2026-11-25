import { ImportCancellation, ImportCancelled } from './cancellation';
import moment from 'moment-timezone';
import buildPostData, {
  RowSkipped,
  type CleanHTML,
  type HtmlToLexical,
  type MarkdownToHtml,
  type PostData,
} from './post-data';
import type { PostsRepository, PostWriteResult, WrittenPost } from './post-repository';
import type { ImportRequest } from './schema';
import type { Clock, RowOutcome } from './store';
import { ImportJournal, readJournalPosition, readMetadata, type JournalStorage } from './journal';
import { openAssetJournal } from './asset-journal';
import { ImportMutations } from './mutations';
import { deliverReports, writeImportReports, type ImportReportContents } from './journal-report';
import { createSummary, type ImportSummary } from './summary';
import type { PreparedImportSource } from './source';
import { rowsAfterCheckpoint, type PreparedPostRow, type PreparedPostRows } from './reader';
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

interface ReportRecipient {
  id: string;
  email: string;
}

export interface EmailNotifications {
  send(run: ImportSummary, recipient: string, reports: ImportReportContents): Promise<unknown>;
  getDefaultRecipient(): Promise<ReportRecipient>;
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
  createMediaInliner: (options: {
    onStored: () => Promise<void>;
    isArchiveAsset: (url: string) => boolean;
  }) => PostMediaInlining;
  hasRunPosts: (tagName: string) => Promise<boolean>;
  signalSiteChanged: (importId: string) => Promise<void>;
  email: EmailNotifications;
  dispatchJob: (job: ContentCSVImportJob) => Promise<void>;
  fileStager: ImportFileStager;
  report: FailureReporter;
  urlForPost: (post: WrittenPost) => string;
  newRunId: () => string;
  getTimezone: () => string;
  now?: Clock;
  trackLocalJobs?: boolean;
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
  private _createMediaInliner: ImporterDeps['createMediaInliner'];
  private _hasRunPosts: ImporterDeps['hasRunPosts'];
  private _signalSiteChanged: ImporterDeps['signalSiteChanged'];
  private _email: EmailNotifications;
  private _dispatchJob: ImporterDeps['dispatchJob'];
  private _fileStager: ImportFileStager;
  private _report: FailureReporter;
  private _pending?: Map<string, ReturnType<typeof Promise.withResolvers<void>>>;
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
    hasRunPosts,
    signalSiteChanged,
    email,
    dispatchJob,
    fileStager,
    report,
    urlForPost,
    newRunId,
    getTimezone,
    now = () => new Date(),
    trackLocalJobs = false,
  }: ImporterDeps) {
    this._files = files;
    this._readRows = readRows;
    this._prepareSource = prepareSource;
    this._posts = posts;
    this._getHtmlToLexical = getHtmlToLexical;
    this._getMarkdownToHtml = getMarkdownToHtml;
    this._getCleanHTML = getCleanHTML;
    this._createMediaInliner = createMediaInliner;
    this._hasRunPosts = hasRunPosts;
    this._signalSiteChanged = signalSiteChanged;
    this._email = email;
    this._dispatchJob = dispatchJob;
    this._fileStager = fileStager;
    this._report = report;
    this._urlForPost = urlForPost;
    this._newRunId = newRunId;
    this._getTimezone = getTimezone;
    this._now = now;
    if (trackLocalJobs) {
      this._pending = new Map();
    }
  }

  async importCSV(request: ImportRequest): Promise<ImportAccepted> {
    const bytes = await this._files.getSize(request.filePath).catch((error) => {
      throw new errors.ValidationError({ message: tpl(messages.unreadableFile), err: error });
    });
    assertCSVUploadSize(bytes);
    const recipient = await this.getRecipient(request.owner, request.requestUserEmail);
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
        recipient,
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

    const recipient = await this.getRecipient(owner, requestUserEmail);
    const claimed = await this._fileStager.claim(id, owner, this._now());
    if (!claimed) {
      return { importId: id };
    }
    try {
      return await this.queueImport(id, selection.file, { mapping, recipient });
    } catch (error) {
      throw uncertainSubmission(error);
    }
  }

  private getRecipient(owner?: ImportOwner, email?: string | null): Promise<ReportRecipient> {
    if (owner?.type === 'user' && email) {
      return Promise.resolve({ id: owner.id, email });
    }
    return this._email.getDefaultRecipient();
  }

  private async queueImport(
    id: string,
    file: StagedImportFile,
    { mapping, recipient }: { mapping?: Record<string, string>; recipient: ReportRecipient },
  ): Promise<ImportAccepted> {
    const importTagNames = buildImportTagNames(id, this._getTimezone(), this._now());
    this.track(id);
    const job = new ContentCSVImportJob({
      importId: id,
      file,
      mapping,
      importTagNames,
      emailRecipient: recipient.email,
      reportOwnerId: recipient.id,
    });
    logLifecycle('queued');
    try {
      await this._dispatchJob(job);
      await this._fileStager.acknowledge(id);
    } catch (error) {
      this.release(id);
      throw error;
    }
    return { importId: id };
  }

  async inspectCSV(request: ImportRequest) {
    assertCSVUploadSize(await this._files.getSize(request.filePath));
    const source = await this._prepareSource(request, { includeAssets: false });
    try {
      const sample = await readCSVPreview(this._files.readSource(source.filePath));
      const uploadId = this._newRunId();
      await this._fileStager.stage({ ...request, total: sample.total }, uploadId, this._now());
      return { upload_id: uploadId, ...sample };
    } finally {
      await this.cleanupSource(source.cleanup);
    }
  }

  cancelUpload(id: string, owner: ImportOwner): Promise<void> {
    return this._fileStager.cancel(id, owner);
  }

  cancelImport(id: string, owner: ImportOwner) {
    return this._fileStager.cancelImport(id, owner, this._now());
  }

  progress(id: string, owner: ImportOwner) {
    return this._fileStager.progress(id, owner, this._now());
  }

  async handle(job: ContentCSVImportJob): Promise<void> {
    let source: PreparedImportSource | undefined;
    let preparedRows: PreparedPostRows | undefined;
    let materialized: DownloadedImportFile | undefined;
    let started = false;
    let canProcess = false;
    let storage: JournalStorage | undefined;
    let mutations: ImportMutations | undefined;
    let journal: ImportJournal | undefined;
    let failureReason: string | undefined;
    let cancelled = false;
    const cancellation = new ImportCancellation(() =>
      this._fileStager.cancellationRequested(job.importId),
    );
    this.track(job.importId);

    try {
      canProcess = await this._fileStager.start(job.importId, this._now());
      started = true;
      if (!canProcess) {
        return;
      }
      storage = this._fileStager.artifacts(job.importId);
      const runMutations = new ImportMutations(storage);
      mutations = runMutations;
      const onStored = () => runMutations.recordAssetWrite();
      await cancellation.start();
      materialized = await this._fileStager.download(job.file);
      const prepared = await this.readPreparedRows({
        filePath: materialized.path,
        fileName: job.file.name,
        mapping: job.mapping,
      });
      source = prepared.source;
      preparedRows = prepared.preparedRows;
      failureReason = await readMetadata(storage, 'failure.txt');
      if (failureReason) {
        return;
      }
      const position = await readJournalPosition(storage);
      journal = new ImportJournal(storage, preparedRows.columns, position);
      if (source.assets) {
        await source.assets.store(await openAssetJournal(storage), onStored, () =>
          cancellation.throwIfStopped(),
        );
      }
      await this.processRows(
        journal,
        job.importTagNames,
        rowsAfterCheckpoint(preparedRows.rows, position.record),
        source,
        onStored,
        cancellation,
      );
      await cancellation.stop();
      cancellation.throwIfStopped();
      await journal.flush();
    } catch (error) {
      if (error instanceof ImportCancelled) {
        cancelled = true;
      } else {
        failureReason = messageOf(error);
        this._report(error);
        if (storage) {
          const artifacts = storage;
          await this.settle(() =>
            artifacts.replaceMetadata('failure.txt', Buffer.from(messageOf(error).slice(0, 1000))),
          );
        }
      }
    } finally {
      await cancellation.stop();
      if (preparedRows) {
        await this.cleanupSource(preparedRows.close);
      }
      if (source) {
        await this.cleanupSource(source.cleanup);
      }
      if (materialized) {
        await this.cleanupSource(materialized.cleanup);
      }
      if (started) {
        if (canProcess) {
          await this.settle(async () => {
            if (failureReason || cancelled) {
              // Rows that completed before an ordinary failure still belong in the report.
              await journal?.flush().catch((error) => {
                failureReason = messageOf(error);
                this._report(error);
              });
            }
            await this.settle(() =>
              this._fileStager.finalizeProgress(
                job.importId,
                failureReason ? 'failed' : cancelled ? 'cancelled' : 'complete',
              ),
            );
            const summary = createSummary(
              job.importId,
              failureReason ? 'failed' : cancelled ? 'cancelled' : 'complete',
              failureReason,
            );
            let reports: ImportReportContents = {};
            const artifacts = storage;
            if (artifacts) {
              try {
                const files = await writeImportReports(artifacts, summary);
                reports = await deliverReports(artifacts, files, (large) =>
                  this._fileStager.reports.retain(
                    job.importId,
                    job.reportOwnerId,
                    large,
                    artifacts,
                    this._now(),
                  ),
                );
              } catch (error) {
                this._report(error);
              }
            }
            await this.settle(async () => {
              const hasTaggedPosts = () => this._hasRunPosts(job.importTagNames[1]);
              summary.changed = mutations
                ? await mutations.changed(summary.counts, hasTaggedPosts)
                : await hasTaggedPosts();
              if (
                summary.changed &&
                (await this._fileStager.claimCacheInvalidation(job.importId))
              ) {
                await this._signalSiteChanged(job.importId);
              }
            });
            if (await this._fileStager.claimEmail(job.importId)) {
              await this._email.send(summary, job.emailRecipient, reports);
            }
          });
        }
        await this.settle(() => this._fileStager.finishProgress(job.importId));
        await this.settle(() => this._fileStager.clearArtifacts(job.importId));
        await this.cleanupStagedFile(job.importId, job.file);
      }
      this.release(job.importId);
    }
  }

  async allSettled(): Promise<void> {
    while (this._pending?.size) {
      await Promise.all([...this._pending.values()].map(({ promise }) => promise));
    }
  }

  private track(id: string): void {
    if (this._pending && !this._pending.has(id)) {
      this._pending.set(id, Promise.withResolvers<void>());
    }
  }

  private release(id: string): void {
    this._pending?.get(id)?.resolve();
    this._pending?.delete(id);
  }

  async cleanupUploads(): Promise<void> {
    const now = this._now();
    await this.settle(() => this._fileStager.cleanupExpired(now, this._report));
    await this.settle(() => this._fileStager.reports.expire(now, this._report));
  }

  openReport(id: string, filename: string, owner: ImportOwner) {
    return this._fileStager.reports.open(id, filename, owner, this._now());
  }

  private async processRows(
    journal: ImportJournal,
    importTagNames: string[],
    rows: AsyncIterable<PreparedPostRow>,
    source: PreparedImportSource,
    onStored: () => Promise<void>,
    cancellation: ImportCancellation,
  ): Promise<void> {
    let urlFailureCount = 0;
    let firstUrlFailure: unknown;
    let media: PostMediaInlining | undefined;

    try {
      const htmlToLexical = this._getHtmlToLexical();
      const markdownToHtml = this._getMarkdownToHtml();
      const cleanHTML = this._getCleanHTML();
      media = this._createMediaInliner({
        onStored,
        isArchiveAsset: (url) => source.assets?.isStoredUrl?.(url) ?? false,
      });
      let successfulWrites = 0;
      let failedRows = 0;
      let firstRowFailure: unknown;

      for await (const { data: row, source: sourceCells, line } of rows) {
        cancellation.throwIfStopped();
        source.assets?.rewriteRows([row]);
        let data: PostData;

        try {
          data = buildPostData(row, htmlToLexical, importTagNames, markdownToHtml, cleanHTML);
        } catch (error) {
          if (error instanceof RowSkipped) {
            await this.recordOutcome(journal, sourceCells, {
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
            await this.recordOutcome(journal, sourceCells, {
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

        cancellation.throwIfStopped();
        let result: PostWriteResult;
        try {
          // options.importing preserves the supplied timestamps and keeps the import silent:
          // the webhook, Slack, IndexNow and mention consumers all stand down on it, and a
          // newsletter can only be attached in the API layer (post-scheduling does not check
          // it, one reason status is never 'scheduled'). Pinned by
          // test/e2e-webhooks/posts-importer.test.js. A fresh options object per row: the
          // model layer mutates it.
          result = await this._posts.write(
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
        } catch (error) {
          if (failedRows === 0) {
            firstRowFailure = error;
          }
          failedRows += 1;
          await this.recordOutcome(journal, sourceCells, {
            line,
            title: row.title,
            status: 'failed',
            reason: messageOf(error),
          });
          continue;
        }

        if (result.status === 'skipped') {
          await this.recordOutcome(journal, sourceCells, {
            line,
            title: row.title,
            status: 'skipped',
            reason: result.reason,
            duplicate: result.duplicate,
          });
          continue;
        }

        const { post, status: writeStatus, warnings } = result;
        successfulWrites += 1;
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
        await this.recordOutcome(journal, sourceCells, outcome);
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
    journal: ImportJournal,
    source: Record<string, string> | undefined,
    outcome: RowOutcome,
  ): Promise<void> {
    return journal.append(source ? { ...outcome, source } : outcome);
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
