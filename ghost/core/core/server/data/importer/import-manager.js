const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const glob = require('glob');
const crypto = require('crypto');
const config = require('../../../shared/config');
const {extract} = require('@tryghost/zip');
const tpl = require('@tryghost/tpl');
const debug = require('@tryghost/debug')('import-manager');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const ImageHandler = require('./handlers/image');
const ImporterContentFileHandler = require('./handlers/ImporterContentFileHandler');
const RevueHandler = require('./handlers/revue');
const JSONHandler = require('./handlers/json');
const MarkdownHandler = require('./handlers/markdown');
const ContentFileImporter = require('./importers/ContentFileImporter');
const RevueImporter = require('./importers/importer-revue');
const DataImporter = require('./importers/data');
const urlUtils = require('../../../shared/url-utils');
const {GhostMailer} = require('../../services/mail');
const jobManager = require('../../services/jobs');
const mediaStorage = require('../../adapters/storage').getStorage('media');
const imageStorage = require('../../adapters/storage').getStorage('images');
const fileStorage = require('../../adapters/storage').getStorage('files');

const emailTemplate = require('./email-template');
const ghostMailer = new GhostMailer();

const messages = {
    couldNotCleanUpFile: {
        error: 'Import could not clean up file ',
        context: 'Your site will continue to work as expected'
    },
    noContentToImport: 'Zip did not include any content to import.',
    invalidZipStructure: 'Invalid zip file structure.',
    invalidZipFileBaseDirectory: 'Invalid zip file: base directory read failed',
    zipContainsMultipleDataFormats: 'Zip file contains multiple data formats. Please split up and import separately.',
    invalidZipFileNameEncoding: 'The uploaded zip could not be read',
    invalidZipFileNameEncodingContext: 'The filename was too long or contained invalid characters',
    invalidZipFileNameEncodingHelp: 'Remove any special characters from the file name, or alternatively try another archiving tool if using MacOS Archive Utility'
};

// Glob levels
const ROOT_ONLY = 0;

const ROOT_OR_SINGLE_DIR = 1;
const ALL_DIRS = 2;
let defaults = {
    extensions: ['.zip'],
    contentTypes: ['application/zip', 'application/x-zip-compressed'],
    directories: []
};

class ImportManager {
    constructor() {
        const mediaHandler = new ImporterContentFileHandler({
            type: 'media',
            // @NOTE: making the second parameter strict folder "content/media" brakes the glob pattern
            //        in the importer, so we need to keep it as general "content" unless
            //        it becomes a strict requirement
            directories: ['media', 'content'],
            ignoreRootFolderFiles: true,
            extensions: config.get('uploads').media.extensions,
            contentTypes: config.get('uploads').media.contentTypes,
            contentPath: config.getContentPath('media'),
            urlUtils: urlUtils,
            storage: mediaStorage
        });

        const filesHandler = new ImporterContentFileHandler({
            type: 'files',
            // @NOTE: making the second parameter strict folder "content/files" brakes the glob pattern
            //        in the importer, so we need to keep it as general "content" unless
            //        it becomes a strict requirement
            directories: ['files', 'content'],
            ignoreRootFolderFiles: true,
            extensions: config.get('uploads').files.extensions,
            contentTypes: config.get('uploads').files.contentTypes,
            contentPath: config.getContentPath('files'),
            urlUtils: urlUtils,
            storage: fileStorage
        });

        const imageImporter = new ContentFileImporter({
            type: 'images',
            store: imageStorage
        });
        const mediaImporter = new ContentFileImporter({
            type: 'media',
            store: mediaStorage
        });

        const contentFilesImporter = new ContentFileImporter({
            type: 'files',
            store: fileStorage
        });

        /**
         * @type {Importer[]} importers
         */
        this.importers = [imageImporter, mediaImporter, contentFilesImporter, RevueImporter, DataImporter];

        /**
         * @type {Handler[]}
         */
        this.handlers = [ImageHandler, mediaHandler, filesHandler, RevueHandler, JSONHandler, MarkdownHandler];

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
     * @returns {String}
     */
    getGlobPattern(items) {
        return '+(' + _.reduce(items, function (memo, ext) {
            return memo !== '' ? memo + '|' + ext : ext;
        }, '') + ')';
    }

    /**
     * @param {String[]} extensions
     * @param {Number} [level]
     * @returns {String}
     */
    getExtensionGlob(extensions, level) {
        const prefix = level === ALL_DIRS ? '**/*' :
            (level === ROOT_OR_SINGLE_DIR ? '{*/*,*}' : '*');

        return prefix + this.getGlobPattern(extensions);
    }

    /**
     *
     * @param {String[]} directories
     * @param {Number} [level]
     * @returns {String}
     */
    getDirectoryGlob(directories, level) {
        const prefix = level === ALL_DIRS ? '**/' :
            (level === ROOT_OR_SINGLE_DIR ? '{*/,}' : '');

        return prefix + this.getGlobPattern(directories);
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
     * @param {String} directory
     * @returns {boolean}
     */
    isValidZip(directory) {
        // Globs match content in the root or inside a single directory
        const extMatchesBase = glob.sync(this.getExtensionGlob(this.getExtensions(), ROOT_OR_SINGLE_DIR), {cwd: directory, nocase: true});

        const extMatchesAll = glob.sync(
            this.getExtensionGlob(this.getExtensions(), ALL_DIRS), {cwd: directory, nocase: true}
        );

        const dirMatches = glob.sync(
            this.getDirectoryGlob(this.getDirectories(), ROOT_OR_SINGLE_DIR), {cwd: directory}
        );

        // If this folder contains importable files or a content or images directory
        if (extMatchesBase.length > 0 || (dirMatches.length > 0 && extMatchesAll.length > 0)) {
            return true;
        }

        if (extMatchesAll.length < 1) {
            throw new errors.UnsupportedMediaTypeError({message: tpl(messages.noContentToImport)});
        }

        throw new errors.UnsupportedMediaTypeError({message: tpl(messages.invalidZipStructure)});
    }

    /**
     * Use the extract module to extract the given zip file to a temp directory & return the temp directory path
     * @param {string} filePath
     * @returns {Promise<string>} full path to the extracted folder
     */
    async extractZip(filePath) {
        const tmpDir = path.join(os.tmpdir(), crypto.randomUUID());
        this.fileToDelete = tmpDir;

        try {
            await extract(filePath, tmpDir);

            // Set permissions for all extracted files
            const files = glob.sync('**/*', {cwd: tmpDir, nodir: true});
            await Promise.all(files.map(file => fs.chmod(path.join(tmpDir, file), 0o644)));
        } catch (err) {
            if (err.message.startsWith('ENAMETOOLONG:')) {
                // The file was probably zipped with MacOS zip utility. Which doesn't correctly set UTF-8 encoding flag.
                // This causes ENAMETOOLONG error on Linux, because the resulting filename length is too long when decoded using the default string encoder.
                throw new errors.UnsupportedMediaTypeError({
                    message: tpl(messages.invalidZipFileNameEncoding),
                    context: tpl(messages.invalidZipFileNameEncodingContext),
                    help: tpl(messages.invalidZipFileNameEncodingHelp),
                    code: 'INVALID_ZIP_FILE_NAME_ENCODING'
                });
            } else if (
                err.message.includes('end of central directory record signature not found')
                || err.message.includes('invalid comment length')
            ) { // This comes from Yauzl when the zip is invalid
                throw new errors.UnsupportedMediaTypeError({
                    message: tpl(messages.invalidZipFileNameEncoding),
                    code: 'INVALID_ZIP_FILE'
                });
            }
            throw err;
        }
        return tmpDir;
    }

    /**
     * Use the handler extensions to get a globbing pattern, then use that to fetch all the files from the zip which
     * are relevant to the given handler, and return them as a name and path combo
     * @param {Object} handler
     * @param {String} directory
     * @returns {File[]} Files
     */
    getFilesFromZip(handler, directory) {
        const globPattern = this.getExtensionGlob(handler.extensions, ALL_DIRS);
        return _.map(glob.sync(globPattern, {cwd: directory, nocase: true}), function (file) {
            return {name: file, path: path.join(directory, file)};
        });
    }

    /**
     * Get the name of the single base directory if there is one, else return an empty string
     * @param {String} directory
     * @returns {String}
     */
    getBaseDirectory(directory) {
        // Globs match root level only
        const extMatches = glob.sync(this.getExtensionGlob(this.getExtensions(), ROOT_ONLY), {cwd: directory, nocase: true});

        const dirMatches = glob.sync(this.getDirectoryGlob(this.getDirectories(), ROOT_ONLY), {cwd: directory, nocase: true});
        let extMatchesAll;

        // There is no base directory
        if (extMatches.length > 0 || dirMatches.length > 0) {
            return;
        }
        // There is a base directory, grab it from any ext match
        extMatchesAll = glob.sync(
            this.getExtensionGlob(this.getExtensions(), ALL_DIRS), {cwd: directory, nocase: true}
        );
        if (extMatchesAll.length < 1 || extMatchesAll[0].split('/').length < 1) {
            throw new errors.ValidationError({message: tpl(messages.invalidZipFileBaseDirectory)});
        }

        return extMatchesAll[0].split('/')[0];
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
                        message: tpl(messages.zipContainsMultipleDataFormats)
                    });
                }

                const data = await handler.loadFile(files, baseDir);
                importData[handler.type] = data;
            }
        }

        if (Object.keys(importData).length === 0) {
            throw new errors.UnsupportedMediaTypeError({
                message: tpl(messages.noContentToImport)
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

        await Promise.all(fileHandlers.map(async (fileHandler) => {
            debug('fileHandler', fileHandler.type);
            importData[fileHandler.type] = await fileHandler.loadFile([_.pick(file, 'name', 'path')]);
        }));

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
                importResults[importer.type] = await importer.doImport(importData[importer.type], importOptions);
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
            logging.error(new errors.InternalServerError({
                err: err,
                context: tpl(messages.couldNotCleanUpFile.error),
                help: tpl(messages.couldNotCleanUpFile.context)
            }));
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
    generateCompletionEmail(result, {
        emailRecipient,
        importTag
    }) {
        const siteUrl = new URL(urlUtils.urlFor('home', null, true));
        const postsUrl = new URL('posts', urlUtils.urlFor('admin', null, true));
        if (importTag && result?.data?.tags) {
            const tag = result.data.tags.find(t => t.name === importTag);
            postsUrl.searchParams.set('tag', tag.slug);
        }

        return emailTemplate({
            result,
            siteUrl,
            postsUrl,
            emailRecipient
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
            return jobManager.addJob({
                job: () => this.importFromFile(file, Object.assign({}, importOptions, {
                    runningInJob: true,
                    data: importData
                })),
                offloaded: false
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
            logging.error(err, 'Content import was unsuccessful');
            importResult = {data: {errors: [err]}};
        } finally {
            // Step 5: Cleanup any files
            await this.cleanUp();

            if (!env?.startsWith('testing')) {
                // Step 6: Send email
                const email = this.generateCompletionEmail(importResult, {
                    emailRecipient: importOptions.user.email,
                    importTag: importOptions.importTag
                });
                await ghostMailer.send({
                    to: importOptions.user.email,
                    subject: importResult?.data?.errors
                        ? 'Your content import was unsuccessful'
                        : 'Your content import has finished',
                    html: email
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
