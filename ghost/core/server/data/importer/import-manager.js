const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const tpl = require('@tryghost/tpl');
const debug = require('@tryghost/debug')('import-manager');
const errors = require('@tryghost/errors');
const ImportArchive = require('./import-archive').default;
const ContentImportJob = require('./jobs/content-import-job').default;

const { emailTemplate } = require('./email-template');

const messages = {
  couldNotCleanUpFile: {
    error: 'Import could not clean up file ',
    context: 'Your site will continue to work as expected',
  },
  noContentToImport: 'Zip did not include any content to import.',
  zipContainsMultipleDataFormats:
    'Zip file contains multiple data formats. Please split up and import separately.',
};
const defaults = {
  extensions: ['.zip'],
  contentTypes: ['application/zip', 'application/x-zip-compressed'],
  directories: [],
};

class ImportManager {
  constructor({
    jobsService,
    importsStorage,
    handlers,
    importers,
    mailer,
    config,
    urlUtils,
    logging,
  }) {
    this.jobsService = jobsService;

    /** @type {Pick<import('../../adapters/storage/LocalStorageBase').default | import('../../adapters/storage/S3Storage').default, 'save' | 'readStream' | 'delete' | 'urlToPath' | 'storagePath'>} */
    this.importsStorage = importsStorage;

    /**
     * @type {Handler[]}
     */
    this.handlers = handlers;

    /**
     * @type {Importer[]} importers
     */
    this.importers = importers;

    this.mailer = mailer;
    this.config = config;
    this.urlUtils = urlUtils;
    this.logging = logging;

    this.archive = new ImportArchive({
      extensions: this.getExtensions(),
      directories: this.getDirectories(),
    });
  }

  /**
   * Get an array of all the file extensions for which we have handlers
   * @returns {string[]}
   */
  getExtensions() {
    return _.union(_.flatMap(this.handlers, 'extensions'), defaults.extensions);
  }

  /**
   * Get an array of all the mime types for which we have handlers
   * @returns {string[]}
   */
  getContentTypes() {
    return _.union(_.flatMap(this.handlers, 'contentTypes'), defaults.contentTypes);
  }

  /**
   * Get an array of directories for which we have handlers
   * @returns {string[]}
   */
  getDirectories() {
    return _.union(_.flatMap(this.handlers, 'directories'), defaults.directories);
  }

  /**
   * Convert items into a glob string
   * @param {String[]} items
   * @returns {string}
   */
  getGlobPattern(items) {
    return this.archive.getGlobPattern(items);
  }

  /**
   * @param {String[]} extensions
   * @param {number} [level]
   * @returns {string}
   */
  getExtensionGlob(extensions, level) {
    return this.archive.getExtensionGlob(extensions, level);
  }

  /**
   *
   * @param {String[]} directories
   * @param {number} [level]
   * @returns {string}
   */
  getDirectoryGlob(directories, level) {
    return this.archive.getDirectoryGlob(directories, level);
  }

  /**
   * Return true if the given file is a Zip
   * @returns Boolean
   */
  isZip(ext) {
    return _.includes(defaults.extensions, ext);
  }

  /**
   * Checks the content of a zip folder to see if it is valid.
   * Importable content includes any files or directories which the handlers can process
   * Importable content must be found either in the root, or inside one base directory
   *
   * @param {string} directory
   * @returns {boolean}
   */
  isValidZip(directory) {
    return this.archive.isValid(directory);
  }

  /**
   * Use the extract module to extract the given zip file to a temp directory & return the temp directory path
   * @param {string} filePath
   * @returns {Promise<string>} full path to the extracted folder
   */
  async extractZip(filePath) {
    return this.archive.extract(filePath);
  }

  /**
   * Use the handler extensions to get a globbing pattern, then use that to fetch all the files from the zip which
   * are relevant to the given handler, and return them as a name and path combo
   * @param {Object} handler
   * @param {string} directory
   * @returns {File[]} Files
   */
  getFilesFromZip(handler, directory) {
    return this.archive.getFiles(directory, handler.extensions);
  }

  /**
   * Get the name of the single base directory if there is one, else return an empty string
   * @param {string} directory
   * @returns {string}
   */
  getBaseDirectory(directory) {
    return this.archive.getBaseDirectory(directory);
  }

  /**
   * Process Zip
   * Takes a reference to a zip file, extracts it and reads it, returning the content to import
   * alongside the extracted directory, which the caller owns from here on
   * @param {File} file
   * @param {boolean} [validateOnly] true to skip the work only an actual import needs
   * @returns {Promise<LoadedImport>}
   */
  async processZip(file, validateOnly = false) {
    const cleanupDirectory = await this.extractZip(file.path);

    try {
      return {
        data: await this.readExtractedZip(cleanupDirectory, validateOnly),
        cleanupDirectory,
      };
    } catch (err) {
      await this.cleanUp(cleanupDirectory);
      throw err;
    }
  }

  /**
   * Send any relevant files from an extracted zip to the right handler, and return an object in
   * the importData format: {data: {}, images: []}
   * The data key contains JSON representing any data that should be imported
   * The image key contains references to images that will be stored (and where they will be stored)
   * @param {string} zipDirectory
   * @param {boolean} [validateOnly] true to skip the work only an actual import needs
   * @returns {Promise<ImportData>}
   */
  async readExtractedZip(zipDirectory, validateOnly = false) {
    /**
     * @type {ImportData}
     */
    const importData = {};

    this.isValidZip(zipDirectory);
    const baseDir = this.getBaseDirectory(zipDirectory);

    for (const handler of this.handlers) {
      const files = this.getFilesFromZip(handler, zipDirectory);

      debug('handler', handler.type, files);

      if (files.length > 0) {
        if (Object.hasOwn(importData, handler.type)) {
          // This limitation is here to reduce the complexity of the importer for now
          throw new errors.UnsupportedMediaTypeError({
            message: tpl(messages.zipContainsMultipleDataFormats),
          });
        }

        // Asset destination preparation belongs to execution. Validation still
        // extracts the archive and parses content to preserve request errors.
        const data =
          validateOnly && handler.directories.length
            ? undefined
            : await handler.loadFile(files, baseDir);
        importData[handler.type] = data;
      }
    }

    if (Object.keys(importData).length === 0) {
      throw new errors.UnsupportedMediaTypeError({
        message: tpl(messages.noContentToImport),
      });
    }

    return importData;
  }

  /**
   * Process File
   * Takes a reference to a single file, sends it to the relevant handler to be loaded and returns an object in the
   * importData format: {data: {}, images: []}
   * The data key contains JSON representing any data that should be imported
   * The image key contains references to images that will be stored (and where they will be stored)
   * @param {File} file
   * @returns {Promise<ImportData>}
   */
  async processFile(file, ext) {
    const fileHandlers = _.filter(this.handlers, function (handler) {
      let match = _.includes(handler.extensions, ext);

      // CASE: content file handlers should ignore files in the root directory
      if (match && handler.directories && handler.directories.length) {
        const dir = path.dirname(file.path)?.split('/')[1];
        match = _.includes(handler.directories, dir);
      }

      return match;
    });

    const importData = {};

    await Promise.all(
      fileHandlers.map(async (fileHandler) => {
        debug('fileHandler', fileHandler.type);
        importData[fileHandler.type] = await fileHandler.loadFile([_.pick(file, 'name', 'path')]);
      }),
    );

    return importData;
  }

  /**
   * Import Step 1:
   * Load the given file into usable importData in the format: {data: {}, images: []}, regardless of
   * whether the file is a single importable file like a JSON file, or a zip file containing loads of files.
   * A zip also yields the extracted directory, which the caller owns from here on.
   * @param {File} file
   * @param {boolean} [validateOnly] true to skip the work only an actual import needs
   * @returns {Promise<LoadedImport>}
   */
  async loadFile(file, validateOnly = false) {
    const ext = path.extname(file.name).toLowerCase();

    return this.isZip(ext)
      ? this.processZip(file, validateOnly)
      : { data: await this.processFile(file, ext) };
  }

  /**
   * Read an upload the way execution will read it, so that a malformed upload still fails the
   * request that uploaded it. The parsed content is of no use here and is dropped with its files.
   * @param {File} file
   * @returns {Promise<void>}
   */
  async validateFile(file) {
    const { cleanupDirectory } = await this.loadFile(file, true);
    await this.cleanUp(cleanupDirectory);
  }

  /**
   * Import Step 2:
   * Pass the prepared importData through the preProcess function of the various importers, so that the importers can
   * make any adjustments to the data based on relationships between it
   * @param {ImportData} importData
   * @returns {Promise<ImportData>}
   */
  async preProcess(importData) {
    debug('preProcess');
    for (const importer of this.importers) {
      importData = importer.preProcess(importData);
    }

    return Promise.resolve(importData);
  }

  /**
   * Import Step 3:
   * Each importer gets passed the data from importData which has the key matching its type - i.e. it only gets the
   * data that it should import. Each importer then handles actually importing that data into Ghost
   * @param {ImportData} importData
   * @param {ImportOptions} [importOptions] to allow override of certain import features such as locking a user
   * @returns {Promise<Object.<string, ImportResult>>} importResults
   */
  async doImport(importData, importOptions) {
    debug('doImport', this.importers);
    importOptions = importOptions || {};
    const importResults = {};

    for (const importer of this.importers) {
      debug('importer looking for', importer.type, 'in', Object.keys(importData));
      if (Object.hasOwn(importData, importer.type)) {
        importResults[importer.type] = await importer.doImport(
          importData[importer.type],
          importOptions,
        );
      }
    }

    return importResults;
  }

  /**
   * Import Step 4:
   * Report on what was imported, currently a no-op
   * @param {Object.<string, ImportResult>} importResults
   * @returns {Promise<Object.<string, ImportResult>>} importResults
   */
  async generateReport(importResults) {
    return Promise.resolve(importResults);
  }

  /**
   * Step 5:
   * Remove the files an import owns, once it is done with them
   * @param {string} [cleanupDirectory]
   * @returns {Promise<void>}
   */
  async cleanUp(cleanupDirectory) {
    if (!cleanupDirectory) {
      return;
    }

    try {
      await fs.remove(cleanupDirectory);
    } catch (err) {
      this.logging.error(
        new errors.InternalServerError({
          err: err,
          context: tpl(messages.couldNotCleanUpFile.error),
          help: tpl(messages.couldNotCleanUpFile.context),
        }),
      );
    }
  }

  /**
   * Import Step 6:
   * Create an email to notify the user that the import has completed
   * @param {ImportResult} result
   * @param {Object} options
   * @param {string} options.emailRecipient
   * @param {string} options.importTag
   * @returns {string}
   */
  generateCompletionEmail(result, { emailRecipient, importTag }) {
    const siteUrl = new URL(this.urlUtils.urlFor('home', null, true));
    const postsUrl = new URL('posts', this.urlUtils.urlFor('admin', null, true));
    if (importTag && result?.data?.tags) {
      const tag = result.data.tags.find((t) => t.name === importTag);
      postsUrl.searchParams.set('tag', tag.slug);
    }

    return emailTemplate({
      result,
      siteUrl,
      postsUrl,
      emailRecipient,
    });
  }

  /**
   * Import From File
   * The main method of the ImportManager, call this to kick everything off!
   * @param {File} file
   * @param {ImportOptions} importOptions to allow override of certain import features such as locking a user
   * @returns {Promise<Object.<string, ImportResult>>}
   */
  async importFromFile(file, importOptions = {}) {
    const env = this.config.get('env');
    if (!env?.startsWith('testing') && !importOptions.runningInJob) {
      // The job loads the upload, so check it here to fail the request when it is malformed
      await this.validateFile(file);

      const job = new ContentImportJob({
        uploadKey: await this.storeUpload(file),
        fileName: file.name,
        emailRecipient: importOptions.user.email,
        importTag: importOptions.importTag,
        returnImportedData: importOptions.returnImportedData,
        importPersistUser: importOptions.importPersistUser,
      });

      try {
        this.logging.info('[Background Job] site-content-import queued');
        return await this.jobsService.dispatch(job);
      } catch (err) {
        await this.cleanUpUpload(job.uploadKey);
        throw err;
      }
    }

    let loaded;
    if (importOptions.data) {
      loaded = { data: importOptions.data };
    } else {
      // Step 1: Handle converting the file to usable data
      loaded = await this.loadFile(file);
    }

    debug('importFromFile completed file load', loaded.data);

    return this.processImport(() => loaded, importOptions);
  }

  /**
   * Store the upload so that execution can read it back once the request, and the file it
   * uploaded, are gone. It is stored under a key of our own rather than its file name.
   * @param {File} file
   * @returns {Promise<string>} the key the adapter stored the upload under
   */
  async storeUpload(file) {
    // Streaming reads deliberately belong to the concrete adapters until the next
    // major release can extend the third-party storage base contract, so an adapter
    // without one fails the import that needs it rather than the boot before it.
    if (typeof this.importsStorage?.readStream !== 'function') {
      throw new errors.IncorrectUsageError({
        message: 'The configured imports storage adapter cannot do streaming reads',
        context: `Site content imports need a storage:imports adapter with a readStream method, and ${this.importsStorage?.constructor?.name || 'the configured adapter'} has none.`,
      });
    }

    const attemptedKey = randomUUID();

    try {
      const url = await this.importsStorage.save(
        { name: attemptedKey, path: file.path },
        this.importsStorage.storagePath,
      );

      return this.importsStorage.urlToPath(url);
    } catch (err) {
      // The adapter may have stored bytes before it failed, and the key we attempted
      // is the only name we have for them.
      await this.cleanUpUpload(attemptedKey);
      throw err;
    }
  }

  /**
   * Read a stored upload back and load it, as the file it was uploaded as. The stored upload
   * and the local copy of it are removed once it is loaded, or has failed to load, so nothing
   * of it outlives this call but the extracted directory a loaded archive owns.
   * @param {string} uploadKey
   * @param {string} fileName the name the file was uploaded with, which decides how it is read
   * @returns {Promise<LoadedImport>}
   */
  async loadStoredUpload(uploadKey, fileName) {
    let downloadDirectory;
    try {
      downloadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'site-content-import-'));
      const downloadPath = path.join(downloadDirectory, 'upload');
      await pipeline(
        await this.importsStorage.readStream({ path: uploadKey }),
        fs.createWriteStream(downloadPath),
      );
      return await this.loadFile({ name: fileName, path: downloadPath });
    } finally {
      await this.cleanUp(downloadDirectory);
      await this.cleanUpUpload(uploadKey);
    }
  }

  /**
   * Remove a stored upload once nothing needs it. A failure here never replaces the
   * outcome of the import itself.
   * @param {string} uploadKey
   * @returns {Promise<void>}
   */
  async cleanUpUpload(uploadKey) {
    try {
      await this.importsStorage.delete(uploadKey);
    } catch (err) {
      this.logging.error(err, '[Background Job] site-content-import upload cleanup failed');
    }
  }

  /**
   * Run a queued import: read the stored upload back and import it, logging when it starts
   * and how it ends
   * @param {ContentImportJob} job
   * @returns {Promise<Object.<string, ImportResult>|undefined>}
   */
  async executeImport(job) {
    const importOptions = {
      user: { email: job.emailRecipient },
      importTag: job.importTag,
      returnImportedData: job.returnImportedData,
      importPersistUser: job.importPersistUser,
    };
    const startedAt = Date.now();
    this.logging.info('[Background Job] site-content-import started');
    try {
      const result = await this.processImport(
        () => this.loadStoredUpload(job.uploadKey, job.fileName),
        importOptions,
      );
      // processImport swallows import failures and resolves undefined,
      // so an absent result is the only signal that the import failed.
      if (result === undefined) {
        this.logging.info(
          `[Background Job] site-content-import failed after ${Date.now() - startedAt}ms`,
        );
      } else {
        const durationMs = Date.now() - startedAt;
        this.logging.info(
          {
            system: {
              event: 'site_content_import.completed',
              import_groups: Object.keys(result).length,
              duration_ms: durationMs,
            },
          },
          `[Background Job] site-content-import completed in ${durationMs}ms`,
        );
      }
      return result;
    } catch (err) {
      this.logging.error(
        err,
        `[Background Job] site-content-import failed after ${Date.now() - startedAt}ms`,
      );
      throw err;
    }
  }

  /**
   * Load content and import it, report on it, release the files it owns, and email the user
   * how it went. A failed import is reported in that email and resolves undefined.
   * @param {() => LoadedImport|Promise<LoadedImport>} loadImport reads the content to import.
   * It runs as the first step of the import, so failing to read is reported like any other
   * import failure.
   * @param {ImportOptions} importOptions
   * @returns {Promise<Object.<string, ImportResult>|undefined>}
   */
  async processImport(loadImport, importOptions) {
    const env = this.config.get('env');
    let loaded;
    let importResult;
    try {
      // Step 1: Load the content to import
      loaded = await loadImport();

      // Step 2: Let the importers pre-process the data
      const importData = await this.preProcess(loaded.data);

      // Step 3: Actually do the import
      // @TODO: It would be cool to have some sort of dry run flag here
      importResult = await this.doImport(importData, importOptions);

      // Step 4: Report on the import
      importResult = await this.generateReport(importResult);

      return importResult;
    } catch (err) {
      this.logging.error(err, '[Background Job] site-content-import error');
      const errorDetails = err.errorDetails || [err];
      importResult = { data: { errors: errorDetails } };
    } finally {
      // Step 5: Cleanup the files this import owns
      await this.cleanUp(loaded?.cleanupDirectory);

      if (!env?.startsWith('testing')) {
        // Step 6: Send email
        const email = this.generateCompletionEmail(importResult, {
          emailRecipient: importOptions.user.email,
          importTag: importOptions.importTag,
        });
        await this.mailer.send({
          to: importOptions.user.email,
          subject: importResult?.data?.errors
            ? 'Your content import was unsuccessful'
            : 'Your content import has finished',
          html: email,
        });
      }
    }
  }
}

/**
 * @typedef {object} ImportOptions
 * @property {boolean} [runningInJob]
 * @property {boolean} [returnImportedData]
 * @property {boolean} [importPersistUser]
 * @property {Object} [user]
 * @property {string} [user.email]
 * @property {string} [importTag]
 * @property {Object} [data]
 */

/**
 * @typedef {object} Importer
 * @property {"images"|"data"} type
 * @property {PreProcessMethod} preProcess
 * @property {DoImportMethod} doImport
 */

/**
 * @callback PreProcessMethod
 * @param {ImportData} importData
 * @returns {ImportData}
 */

/**
 * @callback DoImportMethod
 * @param {object|object[]} importData
 * @param {ImportOptions} importOptions
 * @returns {Promise<ImportResult>} import result
 */

/**
 * @typedef {object} Handler
 * @property {"images"|"data"} type
 * @property {string[]} extensions
 * @property {string[]} contentTypes
 * @property {string[]} directories
 * @property {LoadFileMethod} loadFile
 */

/**
 * @callback LoadFileMethod
 * @param {File[]} files
 * @param {string} [baseDir]
 * @returns {Promise<object[]|object>} data
 */

/**
 * File object
 * @typedef {Object} File
 * @property {string} name
 * @property {string} path
 */

/**
 * @typedef {Object} ImportData
 * @property {Object} [data]
 * @property {Array} [images]
 */

/**
 * @typedef {Object} ImportResult
 */

/**
 * Content ready to import, with the directory its owner has to remove afterwards
 * @typedef {Object} LoadedImport
 * @property {ImportData} data
 * @property {string} [cleanupDirectory]
 */
module.exports = ImportManager;
