import moment from 'moment-timezone';
import buildPostData, {RowSkipped, type HtmlToLexical, type PostData} from './post-data';
import type {PostImportRow} from './row';
import type {Clock, ImportRunStore, RowOutcome} from './store';

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

// The CSV is parsed inside the request (the uploaded temp file is deleted when the
// response is sent); the parsed rows are handed to an in-process background job
// that writes one post per row.

export interface ImportRequest {
    filePath: string;
}

// The id is what a completion report will be looked up by.
export interface ImportAccepted {
    importId: string;
    total: number;
}

export interface CreatedPost {
    id: string;
    toJSON(): Record<string, unknown>;
}

export interface PostsRepository {
    create(data: PostData, options: object): Promise<CreatedPost>;
}

// Must not throw: it is called from catch blocks that exist to stop an error escaping.
export type FailureReporter = (error: unknown) => void;

type ReadRows = (path: string) => Promise<PostImportRow[]>;

const messages = {
    unreadableFile: 'The file could not be parsed as a CSV file.',
    tooManyPosts: 'This file contains more than {max} posts. Imports are temporarily limited to {max} posts at a time — please split the file into smaller files and try again.',
    allWritesFailed: 'Content import failed to write all {count} attempted {postNoun}.',
    urlResolutionFailed: 'Content import could not resolve a URL for {count} created {postNoun}.'
};

const MAX_POSTS = 100;

interface ImporterDeps {
    readRows: ReadRows;
    posts: PostsRepository;
    // A getter so the heavy html->lexical require resolves once per run
    getHtmlToLexical: () => HtmlToLexical;
    addJob: (job: {job: () => Promise<void>; offloaded: boolean; name: string}) => void;
    report: FailureReporter;
    store: ImportRunStore;
    urlForPost: (post: CreatedPost) => string;
    newRunId: () => string;
    getTimezone: () => string;
    now?: Clock;
}

// Two batch tags for every imported post: a date stamp matching the JSON
// importer's (api/endpoints/db.js), and a run tag unique to this import, which
// the report milestones key on.
function buildImportTagNames(runId: string, timezone: string, now: Date): string[] {
    return [
        `#Import ${moment(now).tz(timezone).format('YYYY-MM-DD HH:mm')}`,
        `#Import Run ${runId}`
    ];
}

class ContentCSVImporter {
    private _readRows: ReadRows;
    private _posts: PostsRepository;
    private _getHtmlToLexical: () => HtmlToLexical;
    private _addJob: ImporterDeps['addJob'];
    private _report: FailureReporter;
    private _store: ImportRunStore;
    private _urlForPost: (post: CreatedPost) => string;
    private _newRunId: () => string;
    private _getTimezone: () => string;
    private _now: Clock;

    constructor({readRows, posts, getHtmlToLexical, addJob, report, store, urlForPost, newRunId, getTimezone, now = () => new Date()}: ImporterDeps) {
        this._readRows = readRows;
        this._posts = posts;
        this._getHtmlToLexical = getHtmlToLexical;
        this._addJob = addJob;
        this._report = report;
        this._store = store;
        this._urlForPost = urlForPost;
        this._newRunId = newRunId;
        this._getTimezone = getTimezone;
        this._now = now;
    }

    async importCSV(request: ImportRequest): Promise<ImportAccepted> {
        let rows: PostImportRow[];
        try {
            rows = await this._readRows(request.filePath);
        } catch (error) {
            throw new errors.ValidationError({
                message: tpl(messages.unreadableFile),
                err: error
            });
        }

        // Temporary while import state is held in memory: the durable job
        // system milestone removes the cap.
        if (rows.length > MAX_POSTS) {
            throw new errors.ValidationError({
                message: tpl(messages.tooManyPosts, {max: MAX_POSTS})
            });
        }

        const runId = this._newRunId();
        const importTagNames = buildImportTagNames(runId, this._getTimezone(), this._now());
        this._store.create(runId, rows.length);

        this._addJob({
            job: () => this.runImportJob(runId, importTagNames, rows),
            offloaded: false,
            name: 'content-import'
        });

        return {importId: runId, total: rows.length};
    }

    // Must resolve in every case: the job manager reads a rejected inline job as a
    // defect in the job itself, and there is no retry behind it.
    private async runImportJob(runId: string, importTagNames: string[], rows: PostImportRow[]): Promise<void> {
        let urlFailureCount = 0;
        let firstUrlFailure: unknown;

        try {
            const htmlToLexical = this._getHtmlToLexical();
            let attemptedWrites = 0;
            let successfulWrites = 0;
            let failedWrites = 0;
            let firstWriteFailure: unknown;

            for (const [index, row] of rows.entries()) {
                const line = index + 2;
                let data: PostData;

                try {
                    data = buildPostData(row, htmlToLexical, importTagNames);
                } catch (error) {
                    if (error instanceof RowSkipped) {
                        this._store.record(runId, {
                            line,
                            title: row.title || null,
                            status: 'skipped',
                            reason: messageOf(error)
                        });
                        continue;
                    }

                    // Anything other than an expected source-row refusal is an importer
                    // failure. Stop the run before misclassifying it as a lost write.
                    throw error;
                }

                attemptedWrites += 1;
                let post: CreatedPost;
                try {
                    // options.importing preserves the supplied timestamps and keeps the import silent:
                    // the webhook, Slack, IndexNow and mention consumers all stand down on it, and a
                    // newsletter can only be attached in the API layer (post-scheduling does not check
                    // it, one reason status is never 'scheduled'). Pinned by
                    // test/e2e-webhooks/posts-importer.test.js. A fresh options object per row: the
                    // model layer mutates it.
                    post = await this._posts.create(data, {
                        importing: true,
                        context: {internal: true}
                    });
                    successfulWrites += 1;
                } catch (error) {
                    if (failedWrites === 0) {
                        firstWriteFailure = error;
                    }
                    failedWrites += 1;
                    this._store.record(runId, {
                        line,
                        title: row.title,
                        status: 'failed',
                        reason: messageOf(error)
                    });
                    continue;
                }

                const outcome: RowOutcome = {
                    line,
                    title: row.title,
                    status: 'created',
                    postId: post.id
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

            if (attemptedWrites > 0 && successfulWrites === 0 && failedWrites === attemptedWrites) {
                this._report(new errors.InternalServerError({
                    message: tpl(messages.allWritesFailed, {
                        count: failedWrites,
                        postNoun: failedWrites === 1 ? 'post' : 'posts'
                    }),
                    err: firstWriteFailure
                }));
            }

            this.reportUrlFailures(urlFailureCount, firstUrlFailure);
            this._store.finish(runId);
        } catch (error) {
            this.reportUrlFailures(urlFailureCount, firstUrlFailure);
            this._report(error);
            this._store.fail(runId, messageOf(error));
        }
    }

    private reportUrlFailures(count: number, firstFailure: unknown): void {
        if (count > 0) {
            this._report(new errors.InternalServerError({
                message: tpl(messages.urlResolutionFailed, {
                    count,
                    postNoun: count === 1 ? 'post' : 'posts'
                }),
                err: firstFailure
            }));
        }
    }
}

function messageOf(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message) {
        return error.message;
    }
    return 'Unknown error';
}

export default ContentCSVImporter;
