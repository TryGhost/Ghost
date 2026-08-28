import { z } from 'zod';
import ContentCSVImporter, {
  type ImportAccepted,
  type FailureReporter,
  type EmailNotifications,
} from './import/importer';
import buildCompletionEmail from './import/completion-email';
import { BookshelfPostsRepository } from './import/post-repository';
import readPostRows from './import/reader';
import { importRequestSchema, type ImportRequest } from './import/schema';
import { ImportRunStore } from './import/store';
import { prepareImportSource } from './import/source';
import { PostMediaInliner } from './import/media';
import { isLocalMediaUrl } from './import/local-media-url';
import { urlForImportedPost } from './import/post-link';

// The request is built from HTTP upload metadata, so it is validated at the
// service boundary rather than trusted.
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
  const urlUtils = require('../../../shared/url-utils').default;
  const mediaInlinerService = require('../media-inliner');
  const config = require('../../../shared/config');
  const ObjectID = require('bson-objectid').default;
  const { GhostMailer } = require('../mail');
  const ghostMailer = new GhostMailer();

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

  const email: EmailNotifications = {
    send: (run, recipient) =>
      ghostMailer.send(buildCompletionEmail(run, recipient, urlUtils.urlFor('admin', true))),
    getDefaultRecipient: async () => (await models.User.getOwnerUser()).get('email'),
  };

  return new ContentCSVImporter({
    readRows: readPostRows,
    prepareSource: prepareImportSource,
    posts: new BookshelfPostsRepository(models),
    getHtmlToLexical: () => lexicalLib.htmlToLexicalConverter,
    getMarkdownToHtml: () => require('@tryghost/kg-markdown-html-renderer').render,
    getCleanHTML: () => require('@tryghost/mg-clean-html').cleanHTML,
    createMediaInliner: () =>
      new PostMediaInliner({
        media: mediaInlinerService.getInstance(),
        isLocalMediaUrl: (sourceUrl) =>
          isLocalMediaUrl(sourceUrl, {
            siteUrl: config.getSiteUrl(),
            subdir: config.getSubdir(),
            assetBaseUrls: [
              config.get('urls:image'),
              config.get('urls:media'),
              config.get('urls:files'),
            ],
          }),
      }),
    email,
    addJob: jobsService.addJob.bind(jobsService),
    report,
    store: new ImportRunStore(),
    urlForPost: (post) =>
      urlForImportedPost(post, {
        adminUrl: urlUtils.urlFor('admin', true),
        publishedUrl: (publishedPost) =>
          urlService.getUrlForResource(
            { ...publishedPost.toJSON(), type: 'posts' },
            { absolute: true },
          ),
      }),
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
