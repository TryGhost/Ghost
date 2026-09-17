const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { ZipArchive } = require('archiver');
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
let defaults = {
  extensions: ['.zip'],
  contentTypes: ['application/zip', 'application/x-zip-compressed'],
  directories: [],
};

class ImportManager {
  constructor({
    jobsService,
    importsStorage,
    jobManager,
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
    this.jobManager = jobManager;
    this.handlers = handlers;
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
   * Takes a reference to a zip file, extracts it, sends any relevant files from inside to the right handler, and
   * returns an object in the importData format: {data: {}, images: []}
   * The data key contains JSON representing any data that should be imported
   * The image key contains references to images that will be stored (and where they will be stored)
   * @param {File} file
   * @returns {Promise<ImportData>}
   */
  async processZip(file, prepared = {}, validateOnly = false) {
    const zipDirectory = prepared.cleanupDirectory || (await this.extractZip(file.path));
    prepared.cleanupDirectory = zipDirectory;

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
        if (Object.prototype.hasOwnProperty.call(importData, handler.type)) {
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
   * @param {File} file
   * @returns {Promise<ImportData>}
   */
  loadFile(file, prepared, validateOnly = false) {
    const self = this;
    const ext = path.extname(file.name).toLowerCase();
    return this.isZip(ext)
      ? self.processZip(file, prepared, validateOnly)
      : self.processFile(file, ext);
  }

  async validateFile(file) {
    const validation = {};
    try {
      await this.loadFile(file, validation, true);
    } finally {
      await this.cleanUp(validation.cleanupDirectory);
    }
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
      if (Object.prototype.hasOwnProperty.call(importData, importer.type)) {
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
   * Remove files after we're done (abstracted into a function for easier testing)
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
      await this.validateFile(file);
      // This capability deliberately belongs to the concrete adapters until the
      // next major release can extend the third-party storage base contract.
      if (typeof this.importsStorage?.readStream !== 'function') {
        throw new errors.IncorrectUsageError({
          message: 'The imports storage adapter must support streaming reads',
        });
      }
      const attemptedKey = randomUUID();
      let uploadKey = attemptedKey;
      let normalizationDirectory;
      try {
        let uploadPath = file.path;
        if (!this.isZip(path.extname(file.name).toLowerCase())) {
          normalizationDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'site-import-upload-'));
          uploadPath = path.join(normalizationDirectory, 'upload.zip');
          const archive = new ZipArchive();
          const source = fs.createReadStream(file.path);
          // archiver does not forward errors from appended source streams.
          source.on('error', (error) => archive.destroy(error));
          const written = pipeline(archive, fs.createWriteStream(uploadPath));
          archive.append(source, { name: `${attemptedKey}/${path.basename(file.name)}` });
          try {
            await Promise.all([archive.finalize(), written]);
          } finally {
            source.destroy();
          }
        }
        const url = await this.importsStorage.save(
          { name: attemptedKey, path: uploadPath },
          this.importsStorage.storagePath,
        );
        uploadKey = this.importsStorage.urlToPath(url);
        if (uploadKey !== attemptedKey) {
          throw new errors.IncorrectUsageError({
            message: 'The imports storage adapter must preserve the upload key',
          });
        }
        const job = new ContentImportJob({
          uploadKey,
          emailRecipient: importOptions.user.email,
          importTag: importOptions.importTag,
          returnImportedData: importOptions.returnImportedData,
          importPersistUser: importOptions.importPersistUser,
        });
        this.logging.info('[Background Job] site-content-import queued');
        return await this.jobManager.addJob({
          data: job,
          job: (input) => this.executeImport(input),
          offloaded: false,
        });
      } catch (err) {
        for (const key of new Set([attemptedKey, uploadKey])) {
          await this.cleanUpUpload(key);
        }
        throw err;
      } finally {
        await this.cleanUp(normalizationDirectory);
      }
    }

    const prepared = {};
    try {
      prepared.data = importOptions.data || (await this.loadFile(file, prepared));
    } catch (err) {
      await this.cleanUp(prepared.cleanupDirectory);
      throw err;
    }
    return this.executeImport(prepared, importOptions);
  }

  async executeImport(prepared, importOptions = {}) {
    if (prepared.uploadKey) {
      importOptions = {
        user: { email: prepared.emailRecipient },
        importTag: prepared.importTag,
        returnImportedData: prepared.returnImportedData,
        importPersistUser: prepared.importPersistUser,
        runningInJob: true,
      };
    }
    const env = this.config.get('env');
    const startedAt = Date.now();
    if (!env?.startsWith('testing')) {
      this.logging.info('[Background Job] site-content-import started');
    }
    let result;
    try {
      result = await this.processImport(prepared, importOptions, env);
      if (!env?.startsWith('testing')) {
        this.logging.info(
          result === undefined
            ? `[Background Job] site-content-import failed after ${Date.now() - startedAt}ms`
            : `[Background Job] site-content-import completed in ${Date.now() - startedAt}ms`,
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

  async cleanUpUpload(uploadKey) {
    try {
      await this.importsStorage.delete(uploadKey);
    } catch (err) {
      this.logging.error(err, '[Background Job] site-content-import upload cleanup failed');
    }
  }

  async processImport(prepared, importOptions, env) {
    const uploadKey = prepared.uploadKey;
    let downloadDirectory;
    let importResult;
    try {
      if (uploadKey) {
        prepared = {};
        downloadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'site-content-import-'));
        const archivePath = path.join(downloadDirectory, 'upload.zip');
        await pipeline(
          await this.importsStorage.readStream({ path: uploadKey }),
          fs.createWriteStream(archivePath),
        );
        prepared.cleanupDirectory = await this.extractZip(archivePath);
        const entries = await fs.readdir(prepared.cleanupDirectory);
        // A generated UUID directory marks our single-entry standalone wrapper.
        // Ordinary uploaded ZIPs are stored unchanged and use archive semantics.
        if (entries.length === 1 && entries[0] === uploadKey) {
          const standaloneDirectory = path.join(prepared.cleanupDirectory, uploadKey);
          const [name] = await fs.readdir(standaloneDirectory);
          prepared.data = await this.processFile(
            { name, path: path.join(standaloneDirectory, name) },
            path.extname(name).toLowerCase(),
          );
        } else {
          prepared.data = await this.loadFile({ name: 'upload.zip', path: archivePath }, prepared);
        }
      }
      let importData = prepared.data;
      // Step 2: Let the importers pre-process the data
      importData = await this.preProcess(importData);

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
      // Step 5: Cleanup any files
      await this.cleanUp(prepared.cleanupDirectory);
      if (downloadDirectory) {
        await this.cleanUp(downloadDirectory);
      }
      if (uploadKey) {
        await this.cleanUpUpload(uploadKey);
      }

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
module.exports = ImportManager;
