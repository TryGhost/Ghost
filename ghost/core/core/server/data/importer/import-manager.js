const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../../shared/config');
const tpl = require('@tryghost/tpl');
const debug = require('@tryghost/debug')('import-manager');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const RevueHandler = require('./handlers/revue');
const JSONHandler = require('./handlers/json');
const MarkdownHandler = require('./handlers/markdown');
const RevueImporter = require('./importers/importer-revue');
const DataImporter = require('./importers/data');
const urlUtils = require('../../../shared/url-utils').default;
const { GhostMailer } = require('../../services/mail');
const jobManager = require('../../services/jobs');
const ImportArchive = require('./import-archive').default;
const { createContentFileHandlers, createContentFileImporters } = require('./content-files');

const { emailTemplate } = require('./email-template');
const ghostMailer = new GhostMailer();

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
  constructor() {
    const contentFileHandlers = createContentFileHandlers();
    const contentFileImporters = createContentFileImporters();

    /**
     * @type {Importer[]} importers
     */
    this.importers = [...contentFileImporters, RevueImporter, DataImporter];

    /**
     * @type {Handler[]}
     */
    this.handlers = [...contentFileHandlers, RevueHandler, JSONHandler, MarkdownHandler];

    this.archive = new ImportArchive({
      extensions: this.getExtensions(),
      directories: this.getDirectories(),
    });

    // Keep track of file to cleanup at the end
    /**
     * @type {?string}
     */
    this.fileToDelete = null;
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
    const tmpDir = await this.archive.extract(filePath);
    this.fileToDelete = tmpDir;
    return tmpDir;
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
  async processZip(file) {
    const zipDirectory = await this.extractZip(file.path);

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

        const data = await handler.loadFile(files, baseDir);
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
  loadFile(file) {
    const self = this;
    const ext = path.extname(file.name).toLowerCase();
    return this.isZip(ext) ? self.processZip(file) : self.processFile(file, ext);
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
  async cleanUp() {
    if (this.fileToDelete === null) {
      return;
    }

    try {
      await fs.remove(this.fileToDelete);
    } catch (err) {
      logging.error(
        new errors.InternalServerError({
          err: err,
          context: tpl(messages.couldNotCleanUpFile.error),
          help: tpl(messages.couldNotCleanUpFile.context),
        }),
      );
    }

    this.fileToDelete = null;
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
    const siteUrl = new URL(urlUtils.urlFor('home', null, true));
    const postsUrl = new URL('posts', urlUtils.urlFor('admin', null, true));
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
    let importData;
    if (importOptions.data) {
      importData = importOptions.data;
    } else {
      // Step 1: Handle converting the file to usable data
      // Has to be completed outside of job to ensure file is processed before being deleted
      importData = await this.loadFile(file);
    }

    debug('importFromFile completed file load', importData);

    const env = config.get('env');
    if (!env?.startsWith('testing') && !importOptions.runningInJob) {
      logging.info('[Background Job] site-content-import queued');
      return jobManager.addJob({
        job: async () => {
          const startedAt = Date.now();
          logging.info('[Background Job] site-content-import started');
          try {
            const result = await this.importFromFile(
              file,
              Object.assign({}, importOptions, {
                runningInJob: true,
                data: importData,
              }),
            );
            // importFromFile swallows its own failures and returns undefined,
            // so an absent result is the only signal that the import failed.
            if (result === undefined) {
              logging.info(
                `[Background Job] site-content-import failed after ${Date.now() - startedAt}ms`,
              );
            } else {
              logging.info(
                `[Background Job] site-content-import completed in ${Date.now() - startedAt}ms`,
              );
            }
            return result;
          } catch (err) {
            logging.error(
              err,
              `[Background Job] site-content-import failed after ${Date.now() - startedAt}ms`,
            );
            throw err;
          }
        },
        offloaded: false,
      });
    }

    let importResult;
    try {
      // Step 2: Let the importers pre-process the data
      importData = await this.preProcess(importData);

      // Step 3: Actually do the import
      // @TODO: It would be cool to have some sort of dry run flag here
      importResult = await this.doImport(importData, importOptions);

      // Step 4: Report on the import
      importResult = await this.generateReport(importResult);

      return importResult;
    } catch (err) {
      logging.error(err, '[Background Job] site-content-import error');
      const errorDetails = err.errorDetails || [err];
      importResult = { data: { errors: errorDetails } };
    } finally {
      // Step 5: Cleanup any files
      await this.cleanUp();

      if (!env?.startsWith('testing')) {
        // Step 6: Send email
        const email = this.generateCompletionEmail(importResult, {
          emailRecipient: importOptions.user.email,
          importTag: importOptions.importTag,
        });
        await ghostMailer.send({
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
module.exports = new ImportManager();
