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
    ImageHandler = require('./handlers/image'),
    JSONHandler  = require('./handlers/json'),
    ImageImporter = require('./importers/image'),
    DataImporter = require('./importers/data'),

    defaults;

defaults = {
    extensions: ['.zip'],
    types: ['application/zip', 'application/x-zip-compressed']
};

function ImportManager() {
    this.importers = [ImageImporter, DataImporter];
    this.handlers = [ImageHandler, JSONHandler];
}

_.extend(ImportManager.prototype, {
    getExtensions: function () {
        return _.flatten(_.union(_.pluck(this.handlers, 'extensions'), defaults.extensions));
    },
    getTypes: function () {
        return _.flatten(_.union(_.pluck(this.handlers, 'types'), defaults.types));
    },
    getGlobPattern: function (handler) {
        return '**/*+(' + _.reduce(handler.extensions, function (memo, ext) {
            return memo !== '' ? memo + '|'  + ext : ext;
        }, '') + ')';
    },
    isZip: function (ext) {
        return _.contains(defaults.extensions, ext);
    },
    extractZip: function (filePath) {
        var tmpDir = path.join(os.tmpdir(), uuid.v4());
        return Promise.promisify(extract)(filePath, {dir: tmpDir}).then(function () {
            return tmpDir;
        });
    },
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

                var globPattern = self.getGlobPattern(handler),
                    files = _.map(glob.sync(globPattern, {cwd: directory}), function (file) {
                        return {name: file, path: path.join(directory, file)};
                    });

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
            });
        });
    },
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
        }).finally(function () {
            return Promise.promisify(fs.unlink)(file.path);
        });
    },
    preProcess: function (importData) {
        var ops = [];
        _.each(this.importers, function (importer) {
            ops.push(function () {
                return importer.preProcess(importData);
            });
        });

        return pipeline(ops);
    },
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
    generateReport: function (importData) {
        return importData;
    },
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
