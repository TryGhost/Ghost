import buildPostData, {type HtmlToLexical, type PostData} from './post-data';
import type {PostImportRow} from './row';

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

// The CSV is parsed inside the request (the uploaded temp file is deleted when the
// response is sent); the parsed rows are handed to an in-process background job
// that writes one post per row.

export interface ImportRequest {
    filePath: string;
}

export interface ImportAccepted {
    total: number;
}

export interface PostsRepository {
    create(data: PostData, options: object): Promise<{id: string}>;
}

// Must not throw: it is called from catch blocks that exist to stop an error escaping.
export type FailureReporter = (error: unknown) => void;

type ReadRows = (path: string) => Promise<PostImportRow[]>;

const messages = {
    unreadableFile: 'The file could not be parsed as a CSV file.'
};

interface ImporterDeps {
    readRows: ReadRows;
    posts: PostsRepository;
    // A getter so the heavy html->lexical require resolves once per run
    getHtmlToLexical: () => HtmlToLexical;
    addJob: (job: {job: () => Promise<void>; offloaded: boolean; name: string}) => void;
    report: FailureReporter;
}

class ContentCSVImporter {
    private _readRows: ReadRows;
    private _posts: PostsRepository;
    private _getHtmlToLexical: () => HtmlToLexical;
    private _addJob: ImporterDeps['addJob'];
    private _report: FailureReporter;

    constructor({readRows, posts, getHtmlToLexical, addJob, report}: ImporterDeps) {
        this._readRows = readRows;
        this._posts = posts;
        this._getHtmlToLexical = getHtmlToLexical;
        this._addJob = addJob;
        this._report = report;
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

        this._addJob({
            job: () => this.runImportJob(rows),
            offloaded: false,
            name: 'content-import'
        });

        return {total: rows.length};
    }

    // Must resolve in every case: the job manager reads a rejected inline job as a
    // defect in the job itself, and there is no retry behind it.
    private async runImportJob(rows: PostImportRow[]): Promise<void> {
        try {
            const htmlToLexical = this._getHtmlToLexical();

            for (const row of rows) {
                // options.importing preserves the supplied timestamps and suppresses publish
                // side-effects; the internal context resolves the default author to the site owner.
                // A fresh options object per row: the model layer mutates it.
                await this._posts.create(buildPostData(row, htmlToLexical), {
                    importing: true,
                    context: {internal: true}
                });
            }
        } catch (error) {
            this._report(error);
        }
    }
}

export default ContentCSVImporter;
