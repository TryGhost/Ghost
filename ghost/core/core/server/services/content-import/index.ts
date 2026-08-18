import {z} from 'zod';
import ContentCSVImporter, {type ImportRequest, type ImportAccepted, type FailureReporter} from './import/importer';
import readPostRows from './import/reader';
import {ImportRunStore} from './import/store';

// The request is built from HTTP upload metadata, so it is validated at the
// service boundary rather than trusted.
const importRequestSchema = z.object({filePath: z.string().min(1)});
// A junk timezone setting falls back to UTC rather than mis-stamping the batch tag.
const timezoneSchema = z.string().min(1).catch('Etc/UTC');

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
    const settingsCache = require('../../../shared/settings-cache');
    const urlService = require('../url');
    const ObjectID = require('bson-objectid').default;

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
        report,
        store: new ImportRunStore(),
        // Degrades to the 404 URL for a post the URL service cannot route yet (e.g. a draft).
        urlForPost: post => urlService.getUrlForResource({...post.toJSON(), type: 'posts'}, {absolute: true}),
        newRunId: () => new ObjectID().toHexString(),
        getTimezone: () => timezoneSchema.parse(settingsCache.get('timezone'))
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
