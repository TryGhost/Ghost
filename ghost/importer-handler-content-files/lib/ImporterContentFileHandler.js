const _ = require('lodash');
const path = require('path');

class ImporterContentFileHandler {
    /** @property {'media' | 'files' | 'images'} */
    type;

    /** @property {string[]} */
    directories;

    /** @property {string[]} */
    extensions;

    /** @property {string[]} */
    contentTypes;

    /**
     * Holds path to the destination content directory
     * @property {string} */
    #contentPath;

    /**
     *
     * @param {Object} deps dependencies
     * @param {'media' | 'files' | 'images'} deps.type type of content file
     * @param {string[]} deps.extensions file extensions to search for
     * @param {boolean} [deps.ignoreRootFolderFiles] whether to ignore files in the root folder
     * @param {string[]} deps.contentTypes content types to search for
     * @param {string[]} deps.directories directories to search for content files
     * @param {string} deps.contentPath path to the destination content directory
     * @param {Object} deps.storage storage adapter instance
     * @param {object} deps.urlUtils urlUtils instance
     */
    constructor(deps) {
        this.type = deps.type;
        this.directories = deps.directories;
        this.extensions = deps.extensions;
        this.contentTypes = deps.contentTypes;
        this.ignoreRootFolderFiles = deps.ignoreRootFolderFiles;
        this.storage = deps.storage;
        this.#contentPath = deps.contentPath;
        this.urlUtils = deps.urlUtils;
    }

    async loadFile(files, baseDir) {
        const baseDirRegex = baseDir ? new RegExp('^' + baseDir + '/') : new RegExp('');

        const contentFilesFolderRegexes = _.map(this.storage.staticFileURLPrefix.split('/'), function (dir) {
            return new RegExp('^' + dir + '/');
        });

        if (this.ignoreRootFolderFiles) {
            files = _.filter(files, function (file) {
                return file.name.indexOf('/') !== -1;
            });
        }

        // normalize the directory structure
        const filesContentPath = this.#contentPath;
        files = _.map(files, function (file) {
            const noBaseDir = file.name.replace(baseDirRegex, '');
            let noGhostDirs = noBaseDir;

            _.each(contentFilesFolderRegexes, function (regex) {
                noGhostDirs = noGhostDirs.replace(regex, '');
            });

            file.originalPath = noBaseDir;
            file.name = noGhostDirs;
            file.targetDir = path.join(filesContentPath, path.dirname(noGhostDirs));
            return file;
        });

        const self = this;
        return Promise.all(files.map(function (contentFile) {
            return self.storage.getUniqueFileName(contentFile, contentFile.targetDir).then(function (targetFilename) {
                contentFile.newPath = self.urlUtils.urlJoin(
                    '/',
                    self.urlUtils.getSubdir(),
                    self.storage.staticFileURLPrefix,
                    path.relative(filesContentPath, targetFilename)
                );

                return contentFile;
            });
        }));
    }
}

module.exports = ImporterContentFileHandler;
