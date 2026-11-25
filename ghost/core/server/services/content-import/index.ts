import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extract } from '@tryghost/zip';
import ContentCSVImporter, {
  type ImportAccepted,
  type FailureReporter,
  type EmailNotifications,
} from './import/importer';
import buildCompletionEmail from './import/completion-email';
import { BookshelfPostsRepository } from './import/post-repository';
import readPostRows from './import/reader';
import { confirmImportSchema, importRequestSchema, type ImportRequest } from './import/schema';
import { prepareImportSource, isLegacyImportZip as inspectLegacyImportZip } from './import/source';
import type { ImportFiles } from './import/files';
import { PostMediaInliner } from './import/media';
import { DiskMediaCache } from './import/media-cache';
import { isLocalMediaUrl } from './import/local-media-url';
import { urlForImportedPost } from './import/post-link';
import { createImportFileStager, type DownloadedImportFile } from './import/staged-file';
import type { ImportOwner } from './import/upload-repository';
import ContentCSVImportJob from './jobs/content-csv-import-job';
import CleanCSVUploadsJob from './jobs/clean-csv-uploads-job';
import { getInstance as getJobsService } from '../jobs-service';

// File access is wired here; temporary paths are resolved when an operation runs.
const files: ImportFiles = {
  readSource: (filePath) => createReadStream(filePath),
  writeSource: (filePath) => createWriteStream(filePath, { mode: 0o600 }),
  getSize: async (filePath) => (await stat(filePath)).size,
  createTempDirectory: (prefix) => mkdtemp(path.join(os.tmpdir(), prefix)),
  removeDirectory: (directory) => rm(directory, { recursive: true, force: true }),
  readCache: (filePath) => readFile(filePath, 'utf8'),
  writeCache: (filePath, data) => writeFile(filePath, data, { mode: 0o600 }),
  makeArchiveDirectory: async (directory) => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  },
  extractArchive: extract,
};

export function isLegacyImportZip(filePath: string, fileName: string): Promise<boolean> {
  return inspectLegacyImportZip(files, filePath, fileName);
}

// The request is built from HTTP upload metadata, so it is validated at the
// service boundary rather than trusted.
// A junk timezone setting falls back to UTC rather than mis-stamping the batch tag.
const timezoneSchema = z.string().min(1).catch('Etc/UTC');

const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const sentry = require('../../../shared/sentry');

async function downloadToTempFile(open: () => Promise<Readable>): Promise<DownloadedImportFile> {
  const directory = await files.createTempDirectory('content-csv-download-');
  const cleanup = () => files.removeDirectory(directory);
  const downloadPath = path.join(directory, 'upload');

  try {
    await pipeline(await open(), files.writeSource(downloadPath));
    return { path: downloadPath, cleanup };
  } catch (error) {
    await cleanup().catch(() => {});
    throw error;
  }
}

// Composition root: models and services are wired behind the collaborators the
// importer declares.
function makeImporter(): ContentCSVImporter {
  // Required lazily: boot initialises this service before the model and job layers
  // are guaranteed loaded.
  const models = require('../../models');
  const lexicalLib = require('../../lib/lexical');
  const settingsCache = require('../../../shared/settings-cache');
  const urlService = require('../url');
  const urlUtils = require('../../../shared/url-utils').default;
  const mediaInlinerService = require('../media-inliner').default;
  const config = require('../../../shared/config');
  const { GhostMailer } = require('../../lib/mail');
  const ghostMailer = new GhostMailer();

  // The importer handles terminal failures and finalizes any partial results.
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
    send: (run, recipient, reports) =>
      ghostMailer.send(
        buildCompletionEmail(run, recipient, urlUtils.urlFor('admin', true), reports),
      ),
    getDefaultRecipient: async () => {
      const owner = await models.User.getOwnerUser();
      return { id: owner.id, email: owner.get('email') };
    },
  };

  return new ContentCSVImporter({
    files,
    readRows: (filePath, mapping) => readPostRows(files.readSource(filePath), mapping),
    prepareSource: (request, options) => prepareImportSource(files, request, options),
    posts: new BookshelfPostsRepository(models),
    getHtmlToLexical: () => lexicalLib.htmlToLexicalConverter,
    getMarkdownToHtml: () => require('@tryghost/kg-markdown-html-renderer').render,
    getCleanHTML: () => require('@tryghost/mg-clean-html').cleanHTML,
    createMediaInliner: () =>
      new PostMediaInliner({
        cache: new DiskMediaCache(files),
        media: mediaInlinerService.service,
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
    dispatchJob: (job) => getJobsService().dispatch(job),
    fileStager: createImportFileStager({
      downloadToTempFile,
      getStorage: () => require('../adapter-manager').default.getAdapter('storage:imports'),
      namespace: () =>
        createHash('sha256')
          .update(String(settingsCache.get('site_uuid') || config.getSiteUrl()))
          .digest('hex'),
      getDefaultOwner: async () => ({ type: 'user', id: (await models.User.getOwnerUser()).id }),
    }),
    report,
    urlForPost: (post) =>
      urlForImportedPost(post, {
        adminUrl: urlUtils.urlFor('admin', true),
        publishedUrl: (publishedPost) =>
          urlService.getUrlForResource(
            { ...publishedPost.toJSON(), type: 'posts' },
            { absolute: true },
          ),
      }),
    newRunId: () => randomBytes(12).toString('hex'),
    getTimezone: () => timezoneSchema.parse(settingsCache.get('timezone')),
    trackLocalJobs: config.isTestEnv(),
  });
}

let importer: ContentCSVImporter | undefined;

// Idempotent because tests may boot more than once per process.
export function init(): void {
  importer ??= makeImporter();
}

function getImporter(): ContentCSVImporter {
  if (!importer) {
    throw new errors.InternalServerError({ message: 'Content import service used before init' });
  }

  return importer;
}

function validateRequest(request: ImportRequest): ImportRequest {
  const parsedRequest = importRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    throw new errors.ValidationError({
      message: parsedRequest.error.issues[0]?.message ?? 'Invalid content import request',
      err: parsedRequest.error,
    });
  }

  return parsedRequest.data;
}

export function importCSV(request: ImportRequest): Promise<ImportAccepted> {
  return getImporter().importCSV(validateRequest(request));
}

export function inspectCSV(request: ImportRequest) {
  return getImporter().inspectCSV(validateRequest(request));
}

export function confirmCSV(input: z.input<typeof confirmImportSchema>): Promise<ImportAccepted> {
  const parsed = confirmImportSchema.safeParse(input);
  if (!parsed.success) {
    throw new errors.ValidationError({
      message: parsed.error.issues[0]?.message ?? 'Invalid CSV confirmation.',
      err: parsed.error,
    });
  }
  const { uploadId, owner, mapping, requestUserEmail } = parsed.data;
  return getImporter().confirmCSV(uploadId, owner, mapping, requestUserEmail);
}

export function cancelUpload(id: string, owner: ImportOwner): Promise<void> {
  if (!/^[a-f0-9]{24}$/.test(id)) {
    throw new errors.NotFoundError({ message: 'This CSV upload is no longer available.' });
  }
  return getImporter().cancelUpload(id, owner);
}

export function openReport(id: string, filename: string, owner: ImportOwner) {
  return getImporter().openReport(id, filename, owner);
}

export function handleJob(job: ContentCSVImportJob): Promise<void> {
  if (!importer) {
    throw new errors.InternalServerError({ message: 'Content import service used before init' });
  }

  return importer.handle(job);
}

export function cleanupUploads(): Promise<void> {
  if (!importer) {
    throw new errors.InternalServerError({ message: 'Content import service used before init' });
  }
  return importer.cleanupUploads();
}

export async function scheduleUploadCleanup(): Promise<void> {
  try {
    await getJobsService().scheduleRecurring(new CleanCSVUploadsJob(), { cron: '0 0 * * * *' });
  } catch (error) {
    logging.error(error, 'Could not schedule CSV upload cleanup');
    sentry.captureException(error);
  }
}
