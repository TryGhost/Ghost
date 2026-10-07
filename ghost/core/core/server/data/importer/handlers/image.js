const _ = require('lodash');
const path = require('path');
const logging = require('@tryghost/logging');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils').default;
const adapterManager = require('../../../services/adapter-manager').default;
const { isAllowedImageContent, isSvgExtension } = require('../../../lib/image/image-content');
const { sanitizeSvgFile } = require('../../../lib/image/svg-sanitizer');
const { promisePool } = require('../../../lib/promise-pool');

// Imports can hold thousands of images, so bound the number of open files
const VALIDATION_CONCURRENCY = 10;

/**
 * Files are picked out of the import by extension alone, so check the
 * contents match before they are stored as images. SVGs are sanitized in
 * place, the same as SVG uploads.
 *
 * @param {{name: string, path: string}} file
 * @param {string[]} extensions
 * @returns {Promise<boolean>}
 */
const isValidImage = async (file, extensions) => {
  const ext = path.extname(file.name).toLowerCase();

  if (isSvgExtension(ext)) {
    return sanitizeSvgFile(file.path, ext === '.svgz');
  }

  return isAllowedImageContent(file.path, extensions);
};

const ImageHandler = {
  type: 'images',
  extensions: config.get('uploads').images.extensions,
  contentTypes: config.get('uploads').images.contentTypes,
  directories: ['images', 'content'],

  loadFile: async function (files, baseDir) {
    const store = adapterManager.getAdapter('storage:images');

    const validFiles = new Set();
    await promisePool(
      files.map((file) => async () => {
        if (await isValidImage(file, ImageHandler.extensions)) {
          validFiles.add(file);
        } else {
          logging.warn(`Skipped importing ${file.name}: not a supported image`);
        }
      }),
      VALIDATION_CONCURRENCY,
    );
    files = files.filter((file) => validFiles.has(file));

    const baseDirRegex = baseDir ? new RegExp('^' + _.escapeRegExp(baseDir) + '/') : new RegExp('');

    const imageFolderRegexes = _.map(store.staticFileURLPrefix.split('/'), function (dir) {
      return new RegExp('^' + _.escapeRegExp(dir) + '/');
    });

    // normalize the directory structure
    files = _.map(files, function (file) {
      const noBaseDir = file.name.replace(baseDirRegex, '');
      let noGhostDirs = noBaseDir;

      _.each(imageFolderRegexes, function (regex) {
        noGhostDirs = noGhostDirs.replace(regex, '');
      });

      file.originalPath = noBaseDir;
      file.name = noGhostDirs;
      file.targetDir = path.join(store.storagePath, path.dirname(noGhostDirs));
      return file;
    });

    return Promise.all(
      files.map(function (image) {
        return store.getUniqueFileName(image, image.targetDir).then(function (targetFilename) {
          image.newPath = urlUtils.urlJoin(
            '/',
            urlUtils.getSubdir(),
            store.staticFileURLPrefix,
            path.relative(store.storagePath, targetFilename),
          );

          return image;
        });
      }),
    );
  },
};

module.exports = ImageHandler;
