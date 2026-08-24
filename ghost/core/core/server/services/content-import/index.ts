import { z } from 'zod';
import ContentCSVImporter, {
  type ImportRequest,
  type ImportAccepted,
  type FailureReporter,
} from './import/importer';
import readPostRows from './import/reader';
import { EDITORIAL_POST_FIELDS } from './import/row';
import { ImportRunStore } from './import/store';
import { prepareImportSource } from './import/source';

// The request is built from HTTP upload metadata, so it is validated at the
// service boundary rather than trusted.
const importableFields = new Set<string>(EDITORIAL_POST_FIELDS);
const mappingSchema = z.record(z.string(), z.string()).superRefine((mapping, ctx) => {
  const targets = new Set<string>();
  for (const [header, target] of Object.entries(mapping)) {
    if (!header || header in Object.prototype) {
      ctx.addIssue({ code: 'custom', message: `Invalid CSV header mapping: "${header}"` });
    }
    if (target && !importableFields.has(target)) {
      ctx.addIssue({ code: 'custom', message: `Unknown post field mapping: "${target}"` });
    }
    if (target && targets.has(target)) {
      ctx.addIssue({ code: 'custom', message: `Post field is mapped more than once: "${target}"` });
    }
    targets.add(target);
  }
  if (!targets.has('title')) {
    ctx.addIssue({ code: 'custom', message: 'Post field mapping must include "title"' });
  }
});
const importRequestSchema = z.object({
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mapping: mappingSchema.optional(),
});
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
      logging.error(
        { event: { name: 'content.import.error' }, err: error },
        '[Background Job] content-import error',
      );
      sentry.captureException(error);
    } catch {
      // Callers report from catch blocks, so this must not throw.
    }
  };

  return new ContentCSVImporter({
    readRows: readPostRows,
    prepareSource: prepareImportSource,
    posts: {
      create: (data, options) => models.Post.add(data, options),
    },
    getHtmlToLexical: () => lexicalLib.htmlToLexicalConverter,
    getMarkdownToHtml: () => require('@tryghost/kg-markdown-html-renderer').render,
    getCleanHTML: () => require('@tryghost/mg-clean-html').cleanHTML,
    addJob: jobsService.addJob.bind(jobsService),
    report,
    store: new ImportRunStore(),
    // Degrades to the 404 URL for a post the URL service cannot route yet (e.g. a draft).
    urlForPost: (post) =>
      urlService.getUrlForResource({ ...post.toJSON(), type: 'posts' }, { absolute: true }),
    newRunId: () => new ObjectID().toHexString(),
    getTimezone: () => timezoneSchema.parse(settingsCache.get('timezone')),
  });
}

let importer: ContentCSVImporter | undefined;

// Idempotent because tests may boot more than once per process.
export function init(): void {
  importer ??= makeImporter();
}

export function importCSV(request: ImportRequest): Promise<ImportAccepted> {
  if (!importer) {
    throw new errors.InternalServerError({ message: 'Content import service used before init' });
  }

  const parsedRequest = importRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    throw new errors.ValidationError({
      message: parsedRequest.error.issues[0]?.message ?? 'Invalid content import request',
      err: parsedRequest.error,
    });
  }

  return importer.importCSV(parsedRequest.data);
}
