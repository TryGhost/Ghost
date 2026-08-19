import {z} from 'zod';
import ContentCSVImporter, {type ImportRequest, type ImportAccepted, type FailureReporter} from './import/importer';
import readPostRows from './import/reader';

// The request is built from HTTP upload metadata, so it is validated at the
// service boundary rather than trusted.
const importRequestSchema = z.object({filePath: z.string().min(1)});

const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const sentry = require('../../../shared/sentry');

// Composition root: models and services are wired behind the collaborators the
// importer declares.
function makeImporter(): ContentCSVImporter {
    // Required lazily: boot initialises this service before the model and job layers
    // are guaranteed loaded.
    const models = require('../../models');
    const lexicalLib = require('../../lib/lexical');
    const jobsService = require('../jobs');

    // Inline jobs never reach the job manager's Sentry handler, which is wired to the
    // offloaded worker path only, so a throw here would be seen by nobody.
    const report: FailureReporter = (error) => {
        try {
            logging.error({event: {name: 'content.import.error'}, err: error}, 'Content import failure');
            sentry.captureException(error);
        } catch {
            // Callers report from catch blocks, so this must not throw.
        }
    };

    return new ContentCSVImporter({
        readRows: readPostRows,
        posts: {
            create: (data, options) => models.Post.add(data, options)
        },
        getHtmlToLexical: () => lexicalLib.htmlToLexicalConverter,
        addJob: jobsService.addJob.bind(jobsService),
        report
    });
}

let importer: ContentCSVImporter | undefined;

// Idempotent because tests may boot more than once per process.
export function init(): void {
    importer ??= makeImporter();
}

export function importCSV(request: ImportRequest): Promise<ImportAccepted> {
    if (!importer) {
        throw new errors.InternalServerError({message: 'Content import service used before init'});
    }
    return importer.importCSV(importRequestSchema.parse(request));
}
