const _ = require('lodash');
const path = require('path');

class ImporterMediaHandler {
    /**
     *
     * @param {Object} deps dependencies
     * @param {Object} deps.storage storage adapter instance
     * @param {Object} deps.config config instance
     * @param {object} deps.urlUtils urlUtils instance
     */
    constructor(deps) {
        this.storage = deps.storage;
        this.config = deps.config;
        this.urlUtils = deps.urlUtils;
    }

    type = 'media';

    get extensions() {
        return this.config.get('uploads').media.extensions;
    }

    get contentTypes() {
        return this.config.get('uploads').media.contentTypes;
    }

    directories = ['media', 'content'];

    async loadFile(files, baseDir) {
        const baseDirRegex = baseDir ? new RegExp('^' + baseDir + '/') : new RegExp('');

        const mediaFolderRegexes = _.map(this.storage.staticFileURLPrefix.split('/'), function (dir) {
            return new RegExp('^' + dir + '/');
        });

        // normalize the directory structure
        const mediaContentPath = this.config.getContentPath('media');
        files = _.map(files, function (file) {
            const noBaseDir = file.name.replace(baseDirRegex, '');
            let noGhostDirs = noBaseDir;

            _.each(mediaFolderRegexes, function (regex) {
                noGhostDirs = noGhostDirs.replace(regex, '');
            });

            file.originalPath = noBaseDir;
            file.name = noGhostDirs;
            file.targetDir = path.join(mediaContentPath, path.dirname(noGhostDirs));
            return file;
        });

        const self = this;
        return Promise.all(files.map(function (contentFile) {
            return self.storage.getUniqueFileName(contentFile, contentFile.targetDir).then(function (targetFilename) {
                contentFile.newPath = self.urlUtils.urlJoin(
                    '/',
                    self.urlUtils.getSubdir(),
                    self.storage.staticFileURLPrefix,
                    path.relative(mediaContentPath, targetFilename)
                );

                return contentFile;
            });
        }));
    }
}

module.exports = ImporterMediaHandler;
