const path = require('path');
const os = require('os');
const multer = require('multer');
const fs = require('fs-extra');
const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const {
  IMAGE_UPLOAD_TYPES,
  isAllowedImageContent,
  isImageContentType,
} = require('../../../lib/image/image-content');
const { sanitizeSvgContent, sanitizeSvgFile } = require('../../../lib/image/svg-sanitizer');
const {
  reportThemeUploadSizeLimitError,
} = require('../../../services/themes/upload-size-limit-reporter');

const messages = {
  db: {
    missingFile: 'Please select a database file to import.',
    invalidFile: 'Unsupported file. Please try any of the following formats: {extensions}',
  },
  redirects: {
    missingFile: 'Please select a JSON file.',
    invalidFile: 'Please select a valid JSON file to import.',
  },
  routes: {
    missingFile: 'Please select a YAML file.',
    invalidFile: 'Please select a valid YAML file to import.',
  },
  themes: {
    missingFile: 'Please select a theme.',
    invalidFile: 'Please select a valid zip file.',
  },
  members: {
    missingFile: 'Please select a members CSV file.',
    invalidFile: 'Please select a valid CSV file.',
  },
  posts: {
    missingFile: 'Please select a posts CSV or ZIP file.',
    invalidFile: 'Please select a valid CSV or ZIP file.',
  },
  images: {
    missingFile: 'Please select an image.',
    invalidFile: 'Please select a valid image.',
  },
  svg: {
    missingFile: 'Please select a SVG image.',
    invalidFile: 'Please select a valid SVG image',
  },
  icons: {
    missingFile: 'Please select an icon.',
    invalidFile: 'Icon must be a square .ico or .png file between 60px – 1,000px, under 100kb.',
  },
  media: {
    missingFile: 'Please select a media file.',
    invalidFile: 'Please select a valid media file.',
  },
  thumbnail: {
    missingFile: 'Please select a thumbnail.',
    invalidFile: 'Please select a valid thumbnail.',
  },
  files: {
    missingFile: 'Please select a file.',
    invalidFile:
      'The file type you uploaded is not supported. You can zip your file and upload it as a .zip.',
  },
};

const enabledClear = config.get('uploadClear') || true;
const upload = multer({ dest: os.tmpdir() });
const themeUpload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: config.get('theme:uploadLimits:compressedBytes'),
  },
});

const getContentLength = (req) => {
  const contentLengthHeader = req.get?.('content-length') ?? req.headers?.['content-length'];
  const contentLength = Number(contentLengthHeader);

  if (Number.isFinite(contentLength)) {
    return contentLength;
  }

  return undefined;
};

const getCompressedSizeLimitError = (err, req) => {
  const observedBytes = getContentLength(req);
  const limitBytes = config.get('theme:uploadLimits:compressedBytes');

  return new errors.UnsupportedMediaTypeError({
    message: 'Theme upload exceeds maximum compressed size.',
    context: 'Theme upload exceeds the maximum compressed size.',
    code: 'COMPRESSED_TOO_LARGE',
    errorDetails: {
      observedBytes,
      limitBytes,
      fieldName: err.field,
    },
  });
};

const deleteSingleFile = (file) => {
  if (!file.path) {
    return;
  }

  fs.unlink(file.path).catch((err) => logging.error(err));
};

const single = (name, uploader = upload, options = {}) =>
  function singleUploadFunction(req, res, next) {
    const singleUpload = uploader.single(name);

    singleUpload(req, res, (err) => {
      if (err) {
        if (
          options.isThemeUpload &&
          err instanceof multer.MulterError &&
          err.code === 'LIMIT_FILE_SIZE'
        ) {
          const sizeLimitError = getCompressedSizeLimitError(err, req);

          reportThemeUploadSizeLimitError(sizeLimitError, {
            zip: { size: sizeLimitError.errorDetails.observedBytes },
          });

          return next(sizeLimitError);
        }

        // Busboy, Multer or Dicer errors are usually caused by invalid file uploads
        if (
          err instanceof multer.MulterError ||
          err.stack?.includes('dicer') ||
          err.stack?.includes('busboy')
        ) {
          return next(
            new errors.BadRequestError({
              err,
            }),
          );
        }

        return next(err);
      }
      if (enabledClear) {
        const deleteFiles = () => {
          res.removeListener('finish', deleteFiles);
          res.removeListener('close', deleteFiles);
          if (!req.disableUploadClear) {
            if (req.files) {
              return req.files.forEach(deleteSingleFile);
            }

            if (req.file) {
              return deleteSingleFile(req.file);
            }
          }
        };
        if (!req.disableUploadClear) {
          res.on('finish', deleteFiles);
          res.on('close', deleteFiles);
        }
      }
      next();
    });
  };

const themeZip = (name) => single(name, themeUpload, { isThemeUpload: true });

const media = (fileName, thumbName) =>
  function mediaUploadFunction(req, res, next) {
    const mediaUpload = upload.fields([
      {
        name: fileName,
        maxCount: 1,
      },
      {
        name: thumbName,
        maxCount: 1,
      },
    ]);

    mediaUpload(req, res, (err) => {
      if (err) {
        // Busboy, Multer or Dicer errors are usually caused by invalid file uploads
        if (
          err instanceof multer.MulterError ||
          err.stack?.includes('dicer') ||
          err.stack?.includes('busboy')
        ) {
          return next(
            new errors.BadRequestError({
              err,
            }),
          );
        }

        return next(err);
      }

      if (enabledClear) {
        const deleteFiles = () => {
          res.removeListener('finish', deleteFiles);
          res.removeListener('close', deleteFiles);
          if (!req.disableUploadClear) {
            if (req.files.file) {
              return req.files.file.forEach(deleteSingleFile);
            }
            if (req.files.thumbnail) {
              return req.files.thumbnail.forEach(deleteSingleFile);
            }
          }
        };
        if (!req.disableUploadClear) {
          res.on('finish', deleteFiles);
          res.on('close', deleteFiles);
        }
      }

      next();
    });
  };

const checkFileExists = (fileData) => {
  return !!(fileData.mimetype && fileData.path);
};

const checkFileIsValid = (fileData, types, extensions) => {
  const type = fileData.mimetype;

  if (types.includes(type) && extensions.includes(fileData.ext)) {
    return true;
  }

  return false;
};

/**
 *
 * @param {{ext: string, type: string}} file
 * @returns {boolean}
 *
 * Extension and content type are allowlisted separately, so a file counts as an SVG if either
 * one says so. Storage adapters that use the content type (e.g. S3) would otherwise serve an
 * unsanitized SVG uploaded with a non-SVG extension as image/svg+xml.
 */
const isSvgFile = (file) => {
  return file.ext === '.svg' || file.ext === '.svgz' || file.type === 'image/svg+xml';
};

/**
 *
 * @param {Object} options
 * @param {string} options.type - type of the file
 * @returns {import('express').RequestHandler}
 */
const validation = function ({ type }) {
  // if we finish the data/importer logic, we forward the request to the specified importer

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  return async function uploadValidation(req, res, next) {
    const extensions =
      (config.get('uploads')[type] && config.get('uploads')[type].extensions) || [];
    let contentTypes =
      (config.get('uploads')[type] && config.get('uploads')[type].contentTypes) || [];

    // Boot warns about any configured types this ignores
    if (IMAGE_UPLOAD_TYPES.includes(type)) {
      contentTypes = contentTypes.filter(isImageContentType);
    }

    req.file = req.file || {};
    req.file.name = req.file.originalname;
    req.file.type = req.file.mimetype;

    // Check if a file was provided
    if (!checkFileExists(req.file)) {
      return next(
        new errors.ValidationError({
          message: tpl(messages[type].missingFile),
        }),
      );
    }

    req.file.ext = path.extname(req.file.name).toLowerCase();

    // Check if the file is valid
    if (!checkFileIsValid(req.file, contentTypes, extensions)) {
      return next(
        new errors.UnsupportedMediaTypeError({
          message: tpl(messages[type].invalidFile, { extensions: extensions }),
        }),
      );
    }

    // Sanitize SVG files
    if (isSvgFile(req.file)) {
      const sanitized = await sanitizeSvgFile(req.file.path, req.file.ext === '.svgz');

      if (!sanitized) {
        return next(
          new errors.UnsupportedMediaTypeError({
            message: tpl(messages.svg.invalidFile),
          }),
        );
      }
    } else if (
      // The extension and content type both come from the client, so also
      // check that the contents are an allowed image format
      type === 'images' &&
      !(await isAllowedImageContent(req.file.path, extensions))
    ) {
      return next(
        new errors.UnsupportedMediaTypeError({
          message: tpl(messages[type].invalidFile, { extensions: extensions }),
        }),
      );
    }

    next();
  };
};

/**
 *
 * @param {Object} options
 * @param {string} options.type - type of the file
 * @returns {import('express').RequestHandler}
 */
const mediaValidation = function ({ type }) {
  return async function mediaUploadValidation(req, res, next) {
    const extensions =
      (config.get('uploads')[type] && config.get('uploads')[type].extensions) || [];
    const contentTypes =
      (config.get('uploads')[type] && config.get('uploads')[type].contentTypes) || [];

    const thumbnailExtensions =
      (config.get('uploads').thumbnails && config.get('uploads').thumbnails.extensions) || [];
    const thumbnailContentTypes = (
      (config.get('uploads').thumbnails && config.get('uploads').thumbnails.contentTypes) ||
      []
    ).filter(isImageContentType);

    const { file: [file] = [] } = req.files;
    if (!file || !checkFileExists(file)) {
      return next(
        new errors.ValidationError({
          message: tpl(messages[type].missingFile),
        }),
      );
    }

    req.file = file;
    req.file.name = req.file.originalname;
    req.file.type = req.file.mimetype;
    req.file.ext = path.extname(req.file.name).toLowerCase();

    if (!checkFileIsValid(req.file, contentTypes, extensions)) {
      return next(
        new errors.UnsupportedMediaTypeError({
          message: tpl(messages[type].invalidFile, { extensions: extensions }),
        }),
      );
    }

    const { thumbnail: [thumbnailFile] = [] } = req.files;

    if (thumbnailFile) {
      if (!checkFileExists(thumbnailFile)) {
        return next(
          new errors.ValidationError({
            message: tpl(messages.thumbnail.missingFile),
          }),
        );
      }

      req.thumbnail = thumbnailFile;
      req.thumbnail.ext = path.extname(thumbnailFile.originalname).toLowerCase();
      req.thumbnail.name = `${path.basename(req.file.name, path.extname(req.file.name))}_thumb${req.thumbnail.ext}`;
      req.thumbnail.type = req.thumbnail.mimetype;

      if (!checkFileIsValid(req.thumbnail, thumbnailContentTypes, thumbnailExtensions)) {
        return next(
          new errors.UnsupportedMediaTypeError({
            message: tpl(messages.thumbnail.invalidFile, { extensions: thumbnailExtensions }),
          }),
        );
      }

      // Sanitize SVG thumbnails
      if (isSvgFile(req.thumbnail)) {
        const sanitized = await sanitizeSvgFile(req.thumbnail.path, req.thumbnail.ext === '.svgz');

        if (!sanitized) {
          return next(
            new errors.UnsupportedMediaTypeError({
              message: tpl(messages.svg.invalidFile),
            }),
          );
        }
      } else if (!(await isAllowedImageContent(req.thumbnail.path, thumbnailExtensions))) {
        return next(
          new errors.UnsupportedMediaTypeError({
            message: tpl(messages.thumbnail.invalidFile, { extensions: thumbnailExtensions }),
          }),
        );
      }
    }

    next();
  };
};

/**
 * Extension-only validation for file uploads.
 * This validates the extension against the allowlist.
 * We are not validating the MIME type because it is unreliable and irrelevant as
 * we derive the storage content type from the extension via getStorageContentType().
 *
 * @param {Object} options
 * @param {string} options.type - config key under uploads (e.g. 'files')
 * @returns {import('express').RequestHandler}
 */
const fileValidation = function ({ type }) {
  return function fileUploadValidation(req, res, next) {
    const extensions =
      (config.get('uploads')[type] && config.get('uploads')[type].extensions) || [];

    req.file = req.file || {};
    req.file.name = req.file.originalname;
    req.file.type = req.file.mimetype;

    if (!checkFileExists(req.file)) {
      return next(
        new errors.ValidationError({
          message: tpl(messages[type].missingFile),
        }),
      );
    }

    req.file.ext = path.extname(req.file.name).toLowerCase();

    if (!extensions.includes(req.file.ext)) {
      return next(
        new errors.UnsupportedMediaTypeError({
          message: tpl(messages[type].invalidFile, { extensions: extensions }),
        }),
      );
    }

    next();
  };
};

module.exports = {
  single,
  themeZip,
  media,
  validation,
  mediaValidation,
  fileValidation,
};

// Exports for testing only
module.exports._test = {
  checkFileExists,
  checkFileIsValid,
  getCompressedSizeLimitError,
  sanitizeSvgContent,
};
