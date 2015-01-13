var _            = require('lodash'),
    Promise      = require('bluebird'),
    sequence     = require('../../utils/sequence'),
    pipeline     = require('../../utils/pipeline'),
    fs           = require('fs-extra'),
    path         = require('path'),
    os           = require('os'),
    glob         = require('glob'),
    uuid         = require('node-uuid'),
    extract      = require('extract-zip'),
    errors       = require('../../errors'),
    ImageHandler    = require('./handlers/image'),
    JSONHandler     = require('./handlers/json'),
    MarkdownHandler = require('./handlers/markdown'),
    ImageImporter   = require('./importers/image'),
    DataImporter    = require('./importers/data'),

    // Glob levels
    ROOT_ONLY = 0,
    ROOT_OR_SINGLE_DIR = 1,
    ALL_DIRS = 2,

    defaults;

defaults = {
    extensions: ['.zip'],
    types: ['application/zip', 'application/x-zip-compressed'],
    directories: []
};

function ImportManager() {
    this.importers = [ImageImporter, DataImporter];
    this.handlers = [ImageHandler, JSONHandler, MarkdownHandler];
    // Keep track of files to cleanup at the end
    this.filesToDelete = [];
}

/**
 * A number, or a string containing a number.
 * @typedef {Object} ImportData
 * @property [Object] data
 * @property [Array] images
 */

_.extend(ImportManager.prototype, {
    /**
     * Get an array of all the file extensions for which we have handlers
     * @returns {string[]}
     */
    getExtensions: function () {
        return _.flatten(_.union(_.pluck(this.handlers, 'extensions'), defaults.extensions));
    },
    /**
     * Get an array of all the mime types for which we have handlers
     * @returns {string[]}
     */
    getTypes: function () {
        return _.flatten(_.union(_.pluck(this.handlers, 'types'), defaults.types));
    },
    /**
     * Get an array of directories for which we have handlers
     * @returns {string[]}
     */
    getDirectories: function () {
        return _.flatten(_.union(_.pluck(this.handlers, 'directories'), defaults.directories));
    },
    /**
     * Convert items into a glob string
     * @param {String[]} items
     * @returns {String}
     */
    getGlobPattern: function (items) {
        return '+(' + _.reduce(items, function (memo, ext) {
            return memo !== '' ? memo + '|'  + ext : ext;
        }, '') + ')';
    },
    /**
     * @param {String[]} extensions
     * @param {Number} level
     * @returns {String}
     */
    getExtensionGlob: function (extensions, level) {
        var prefix = level === ALL_DIRS ? '**/*' :
            (level === ROOT_OR_SINGLE_DIR ? '{*/*,*}' : '*');

        return prefix + this.getGlobPattern(extensions);
    },
    /**
     *
     * @param {String[]} directories
     * @param {Number} level
     * @returns {String}
     */
    getDirectoryGlob: function (directories, level) {
        var prefix = level === ALL_DIRS ? '**/' :
            (level === ROOT_OR_SINGLE_DIR ? '{*/,}' : '');

        return prefix + this.getGlobPattern(directories);
    },
    /**
     * Remove files after we're done (abstracted into a function for easier testing)
     * @returns {Function}
     */
    cleanUp: function () {
        var filesToDelete = this.filesToDelete;
        return function (result) {
            _.each(filesToDelete, function (fileToDelete) {
                fs.remove(fileToDelete, function (err) {
                    if (err) {
                        errors.logError(err, 'Import could not clean up file ', 'Your blog will continue to work as expected');
                    }
                });
            });

            return result;
        };
    },
    /**
     * Return true if the given file is a Zip
     * @returns Boolean
     */
    isZip: function (ext) {
        return _.contains(defaults.extensions, ext);
    },
    /**
     * Checks the content of a zip folder to see if it is valid.
     * Importable content includes any files or directories which the handlers can process
     * Importable content must be found either in the root, or inside one base directory
     *
     * @param {String} directory
     * @returns {Promise}
     */
    isValidZip: function (directory) {
        // Globs match content in the root or inside a single directory
        var extMatchesBase = glob.sync(
                this.getExtensionGlob(this.getExtensions(), ROOT_OR_SINGLE_DIR), {cwd: directory}
            ),
            extMatchesAll = glob.sync(
                this.getExtensionGlob(this.getExtensions(), ALL_DIRS), {cwd: directory}
            ),
            dirMatches = glob.sync(
                this.getDirectoryGlob(this.getDirectories(), ROOT_OR_SINGLE_DIR), {cwd: directory}
            ),
            oldRoonMatches = glob.sync(this.getDirectoryGlob(['drafts', 'published', 'deleted'], ROOT_OR_SINGLE_DIR),
                {cwd: directory});

        // This is a temporary extra message for the old format roon export which doesn't work with Ghost
        if (oldRoonMatches.length > 0) {
            throw new errors.UnsupportedMediaTypeError(
                'Your zip file looks like an old format Roon export, please re-export your Roon blog and try again.'
            );
        }

        // If this folder contains importable files or a content or images directory
        if (extMatchesBase.length > 0 || (dirMatches.length > 0 && extMatchesAll.length > 0)) {
            return true;
        }

        if (extMatchesAll.length < 1) {
            throw new errors.UnsupportedMediaTypeError('Zip did not include any content to import.');
        }

        throw new errors.UnsupportedMediaTypeError('Invalid zip file structure.');
    },
    /**
     * Use the extract module to extract the given zip file to a temp directory & return the temp directory path
     * @param {String} filePath
     * @returns {Promise[]} Files
     */
    extractZip: function (filePath) {
        var tmpDir = path.join(os.tmpdir(), uuid.v4());
        this.filesToDelete.push(tmpDir);
        return Promise.promisify(extract)(filePath, {dir: tmpDir}).then(function () {
            return tmpDir;
        });
    },
    /**
     * Use the handler extensions to get a globbing pattern, then use that to fetch all the files from the zip which
     * are relevant to the given handler, and return them as a name and path combo
     * @param {Object} handler
     * @param {String} directory
     * @returns [] Files
     */
    getFilesFromZip: function (handler, directory) {
        var globPattern = this.getExtensionGlob(handler.extensions, ALL_DIRS);
        return _.map(glob.sync(globPattern, {cwd: directory}), function (file) {
            return {name: file, path: path.join(directory, file)};
        });
    },
    /**
     * Get the name of the single base directory if there is one, else return an empty string
     * @param {String} directory
     * @returns {Promise (String)}
     */
    getBaseDirectory: function (directory) {
        // Globs match root level only
        var extMatches = glob.sync(this.getExtensionGlob(this.getExtensions(), ROOT_ONLY), {cwd: directory}),
            dirMatches = glob.sync(this.getDirectoryGlob(this.getDirectories(), ROOT_ONLY), {cwd: directory}),
            extMatchesAll;

        // There is no base directory
        if (extMatches.length > 0 || dirMatches.length > 0) {
            return;
        }
        // There is a base directory, grab it from any ext match
        extMatchesAll = glob.sync(
            this.getExtensionGlob(this.getExtensions(), ALL_DIRS), {cwd: directory}
        );
        if (extMatchesAll.length < 1 || extMatchesAll[0].split('/') < 1) {
            throw new errors.ValidationError('Invalid zip file: base directory read failed');
        }

        return extMatchesAll[0].split('/')[0];
    },
    /**
     * Process Zip
     * Takes a reference to a zip file, extracts it, sends any relevant files from inside to the right handler, and
     * returns an object in the importData format: {data: {}, images: []}
     * The data key contains JSON representing any data that should be imported
     * The image key contains references to images that will be stored (and where they will be stored)
     * @param {File} file
     * @returns {Promise(ImportData)}
     */
    processZip: function (file) {
        var self = this;

        return this.extractZip(file.path).then(function (zipDirectory) {
            var ops = [],
                importData = {},
                baseDir;

            self.isValidZip(zipDirectory);
            baseDir = self.getBaseDirectory(zipDirectory);

            _.each(self.handlers, function (handler) {
                if (importData.hasOwnProperty(handler.type)) {
                    // This limitation is here to reduce the complexity of the importer for now
                    return Promise.reject(new errors.UnsupportedMediaTypeError(
                        'Zip file contains multiple data formats. Please split up and import separately.'
                    ));
                }

                var files = self.getFilesFromZip(handler, zipDirectory);

                if (files.length > 0) {
                    ops.push(function () {
                        return handler.loadFile(files, baseDir).then(function (data) {
                            importData[handler.type] = data;
                        });
                    });
                }
            });

            if (ops.length === 0) {
                return Promise.reject(new errors.UnsupportedMediaTypeError(
                    'Zip did not include any content to import.'
                ));
            }

            return sequence(ops).then(function () {
                return importData;
            });
        });
    },
    /**
     * Process File
     * Takes a reference to a single file, sends it to the relevant handler to be loaded and returns an object in the
     * importData format: {data: {}, images: []}
     * The data key contains JSON representing any data that should be imported
     * The image key contains references to images that will be stored (and where they will be stored)
     * @param {File} file
     * @returns {Promise(ImportData)}
     */
    processFile: function (file, ext) {
        var fileHandler = _.find(this.handlers, function (handler) {
            return _.contains(handler.extensions, ext);
        });

        return fileHandler.loadFile([_.pick(file, 'name', 'path')]).then(function (loadedData) {
            // normalize the returned data
            var importData = {};
            importData[fileHandler.type] = loadedData;
            return importData;
        });
    },
    /**
     * Import Step 1:
     * Load the given file into usable importData in the format: {data: {}, images: []}, regardless of
     * whether the file is a single importable file like a JSON file, or a zip file containing loads of files.
     * @param {File} file
     * @returns {Promise}
     */
    loadFile: function (file) {
        var self = this,
            ext = path.extname(file.name).toLowerCase();

        this.filesToDelete.push(file.path);

        return this.isZip(ext) ? self.processZip(file) : self.processFile(file, ext);
    },
    /**
     * Import Step 2:
     * Pass the prepared importData through the preProcess function of the various importers, so that the importers can
     * make any adjustments to the data based on relationships between it
     * @param {ImportData} importData
     * @returns {Promise(ImportData)}
     */
    preProcess: function (importData) {
        var ops = [];
        _.each(this.importers, function (importer) {
            ops.push(function () {
                return importer.preProcess(importData);
            });
        });

        return pipeline(ops);
    },
    /**
     * Import Step 3:
     * Each importer gets passed the data from importData which has the key matching its type - i.e. it only gets the
     * data that it should import. Each importer then handles actually importing that data into Ghost
     * @param {ImportData} importData
     * @returns {Promise(ImportData)}
     */
    doImport: function (importData) {
        var ops = [];
        _.each(this.importers, function (importer) {
            if (importData.hasOwnProperty(importer.type)) {
                ops.push(function () {
                    return importer.doImport(importData[importer.type]);
                });
            }
        });

        return sequence(ops).then(function (importResult) {
            return importResult;
        });
    },
    /**
     * Import Step 4:
     * Report on what was imported, currently a no-op
     * @param {ImportData} importData
     * @returns {Promise(ImportData)}
     */
    generateReport: function (importData) {
        return Promise.resolve(importData);
    },
    /**
     * Import From File
     * The main method of the ImportManager, call this to kick everything off!
     * @param {File} file
     * @returns {Promise}
     */
    importFromFile: function (file) {
        var self = this;

        // Step 1: Handle converting the file to usable data
        return this.loadFile(file).then(function (importData) {
            // Step 2: Let the importers pre-process the data
            return self.preProcess(importData);
        }).then(function (importData) {
            // Step 3: Actually do the import
            // @TODO: It would be cool to have some sort of dry run flag here
            return self.doImport(importData);
        }).then(function (importData) {
            // Step 4: Report on the import
            return self.generateReport(importData)
                // Step 5: Cleanup any files
                .finally(self.cleanUp());
        });
    }
});

module.exports = new ImportManager();
