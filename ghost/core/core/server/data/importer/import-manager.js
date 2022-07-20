const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const glob = require('glob');
const uuid = require('uuid');
const {extract} = require('@tryghost/zip');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const ImageHandler = require('./handlers/image');
const JSONHandler = require('./handlers/json');
const MarkdownHandler = require('./handlers/markdown');
const ImageImporter = require('./importers/image');
const DataImporter = require('./importers/data');

const messages = {
    couldNotCleanUpFile: {
        error: 'Import could not clean up file ',
        context: 'Your site will continue to work as expected'
    },
    noContentToImport: 'Zip did not include any content to import.',
    invalidZipStructure: 'Invalid zip file structure.',
    invalidZipFileBaseDirectory: 'Invalid zip file: base directory read failed',
    zipContainsMultipleDataFormats: 'Zip file contains multiple data formats. Please split up and import separately.'
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
        /**
         * @type {Importer[]} importers
         */
        this.importers = [ImageImporter, DataImporter];

        /**
         * @type {Handler[]}
         */
        this.handlers = [ImageHandler, JSONHandler, MarkdownHandler];

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
    extractZip(filePath) {
        const tmpDir = path.join(os.tmpdir(), uuid.v4());
        this.fileToDelete = tmpDir;

        return extract(filePath, tmpDir).then(function () {
            return tmpDir;
        });
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
    processFile(file, ext) {
        const fileHandler = _.find(this.handlers, function (handler) {
            return _.includes(handler.extensions, ext);
        });

        return fileHandler.loadFile([_.pick(file, 'name', 'path')]).then(function (loadedData) {
            // normalize the returned data
            const importData = {};
            importData[fileHandler.type] = loadedData;
            return importData;
        });
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
     * @returns {Promise<ImportResult[]>} importResults
     */
    async doImport(importData, importOptions) {
        importOptions = importOptions || {};
        const importResults = [];

        for (const importer of this.importers) {
            if (Object.prototype.hasOwnProperty.call(importData, importer.type)) {
                importResults.push(await importer.doImport(importData[importer.type], importOptions));
            }
        }

        return importResults;
    }

    /**
     * Import Step 4:
     * Report on what was imported, currently a no-op
     * @param {ImportResult[]} importResults
     * @returns {Promise<ImportResult[]>} importResults
     */
    async generateReport(importResults) {
        return Promise.resolve(importResults);
    }

    /**
     * Import From File
     * The main method of the ImportManager, call this to kick everything off!
     * @param {File} file
     * @param {ImportOptions} importOptions to allow override of certain import features such as locking a user
     * @returns {Promise<ImportResult[]>}
     */
    async importFromFile(file, importOptions = {}) {
        try {
            // Step 1: Handle converting the file to usable data
            let importData = await this.loadFile(file);

            // Step 2: Let the importers pre-process the data
            importData = await this.preProcess(importData);
        
            // Step 3: Actually do the import
            // @TODO: It would be cool to have some sort of dry run flag here
            let importResult = await this.doImport(importData, importOptions);
            
            // Step 4: Report on the import
            return await this.generateReport(importResult);
        } finally {
            // Step 5: Cleanup any files
            this.cleanUp();
        }
    }
}

/**
 * @typedef {object} ImportOptions
 * @property {boolean} [returnImportedData]
 * @property {boolean} [importPersistUser]
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
