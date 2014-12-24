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
    ImageHandler  = require('./handlers/image'),
    JSONHandler   = require('./handlers/json'),
    ImageImporter = require('./importers/image'),
    DataImporter  = require('./importers/data'),

    defaults;

defaults = {
    extensions: ['.zip'],
    types: ['application/zip', 'application/x-zip-compressed']
};

function ImportManager() {
    this.importers = [ImageImporter, DataImporter];
    this.handlers = [ImageHandler, JSONHandler];
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
     * @returns []
     */
    getExtensions: function () {
        return _.flatten(_.union(_.pluck(this.handlers, 'extensions'), defaults.extensions));
    },
    /**
     * Get an array of all the mime types for which we have handlers
     * @returns []
     */
    getTypes: function () {
        return _.flatten(_.union(_.pluck(this.handlers, 'types'), defaults.types));
    },
    /**
     * Convert the extensions supported by a given handler into a glob string
     * @returns String
     */
    getGlobPattern: function (handler) {
        return '**/*+(' + _.reduce(handler.extensions, function (memo, ext) {
            return memo !== '' ? memo + '|'  + ext : ext;
        }, '') + ')';
    },
    /**
     * Remove a file after we're done (abstracted into a function for easier testing)
     * @param {File} file
     * @returns {Function}
     */
    cleanUp: function (file) {
        var fileToDelete = file;
        return function (result) {
            try {
                fs.remove(fileToDelete);
            } catch (err) {
                errors.logError(err, 'Import could not clean up file', 'You blog will continue to work as expected');
            }
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
     * Use the extract module to extract the given zip file to a temp directory & return the temp directory path
     * @param {String} filePath
     * @returns {Promise[]} Files
     */
    extractZip: function (filePath) {
        var tmpDir = path.join(os.tmpdir(), uuid.v4());
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
        var globPattern = this.getGlobPattern(handler);
        return _.map(glob.sync(globPattern, {cwd: directory}), function (file) {
            return {name: file, path: path.join(directory, file)};
        });
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
        return this.extractZip(file.path).then(function (directory) {
            var ops = [],
                importData = {},
                startDir = glob.sync(file.name.replace('.zip', ''), {cwd: directory});

            startDir = startDir[0] || false;

            _.each(self.handlers, function (handler) {
                if (importData.hasOwnProperty(handler.type)) {
                    // This limitation is here to reduce the complexity of the importer for now
                    return Promise.reject(new errors.UnsupportedMediaTypeError(
                        'Zip file contains too many types of import data. Please split it up and import separately.'
                    ));
                }

                var files = self.getFilesFromZip(handler, directory);

                if (files.length > 0) {
                    ops.push(function () {
                        return handler.loadFile(files, startDir).then(function (data) {
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
            }).finally(self.cleanUp(directory));
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

        return Promise.resolve(this.isZip(ext)).then(function (isZip) {
            if (isZip) {
                // If it's a zip, process the zip file
                return self.processZip(file);
            } else {
                // Else process the file
                return self.processFile(file, ext);
            }
        }).finally(self.cleanUp(file.path));
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
     * @returns {*}
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
            // Step 4: Finally, report on the import
            return self.generateReport(importData);
        });
    }
});

module.exports = new ImportManager();
