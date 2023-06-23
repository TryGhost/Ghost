const _ = require('lodash');
const path = require('path');
const {NoContentError} = require('@tryghost/errors');
const imageTransform = require('@tryghost/image-transform');
const storage = require('../../../server/adapters/storage');
const activeTheme = require('../../services/theme-engine/active');
const config = require('../../../shared/config');
const {imageSize} = require('../../../server/lib/image');

const SIZE_PATH_REGEX = /^\/size\/([^/]+)\//;
const FORMAT_PATH_REGEX = /^\/format\/([^./]+)\//;

const TRAILING_SLASH_REGEX = /\/+$/;

module.exports = function (req, res, next) {
    // In admin we need to read images and calculate the average color (blocked by CORS otherwise)
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!SIZE_PATH_REGEX.test(req.url)) {
        return next();
    }

    if (TRAILING_SLASH_REGEX.test(req.url)) {
        return next();
    }

    const requestedDimension = req.url.match(SIZE_PATH_REGEX)[1];

    // Note that we don't use sizeImageDir because we need to keep the trailing slash
    let imagePath = req.url.replace(`/size/${requestedDimension}`, '');

    // Check if we want to format the image
    let format = null;
    const matchedFormat = imagePath.match(FORMAT_PATH_REGEX);
    if (matchedFormat) {
        format = matchedFormat[1];

        // Note that we don't use matchedFormat[0] because we need to keep the trailing slash
        imagePath = imagePath.replace(`/format/${format}`, '');
    }

    const redirectToOriginal = () => {
        // We need to keep the first slash here
        let url = req.originalUrl
            .replace(`/size/${requestedDimension}`, '');

        if (format) {
            url = url.replace(`/format/${format}`, '');
        }
        return res.redirect(url);
    };

    const requestUrlFileExtension = path.parse(req.url).ext;

    // CASE: no file extension was given
    if (requestUrlFileExtension === '') {
        return next();
    }

    const contentImageSizes = config.get('imageOptimization:contentImageSizes');
    const internalImageSizes = config.get('imageOptimization:internalImageSizes');
    const themeImageSizes = activeTheme.get().config('image_sizes');
    const imageSizes = _.merge({}, themeImageSizes, internalImageSizes, contentImageSizes);

    // build a new object with keys that match the strings used in size paths like "w640h480"
    const imageDimensions = {};
    Object.keys(imageSizes).forEach((size) => {
        const {width, height} = imageSizes[size];
        const dimension = (width ? 'w' + width : '') + (height ? 'h' + height : '');

        // if there are duplicate size names the first encountered wins
        if (!imageDimensions[dimension]) {
            imageDimensions[dimension] = imageSizes[size];
        }
    });

    const imageDimensionConfig = imageDimensions[requestedDimension];
    // CASE: unknown dimension
    if (!imageDimensionConfig || (!imageDimensionConfig.width && !imageDimensionConfig.height)) {
        return redirectToOriginal();
    }

    // CASE: image transform is not capable of transforming some files (e.g. .ico)
    if (!imageTransform.canTransformFileExtension(requestUrlFileExtension)) {
        return redirectToOriginal();
    }

    if (format) {
        // CASE: When formatting, we need to check if the imageTransform package supports this specific format
        if (!imageTransform.canTransformToFormat(format)) {
            // transform not supported
            return redirectToOriginal();
        }
    }

    // CASE: when transforming is supported, we need to check if it is desired
    // (e.g. it is not desired to resize SVGs when not formatting them to a different type)
    if (!format && !imageTransform.shouldResizeFileExtension(requestUrlFileExtension)) {
        return redirectToOriginal();
    }

    const storageInstance = storage.getStorage('images');
    // CASE: unsupported storage adapter
    if (typeof storageInstance.saveRaw !== 'function') {
        return redirectToOriginal();
    }

    // exit early if sharp isn't installed to avoid extra file reads
    if (!imageTransform.canTransformFiles()) {
        return redirectToOriginal();
    }

    storageInstance.exists(req.url).then((exists) => {
        if (exists) {
            return;
        }

        return imageSize.getOriginalImagePath(imagePath)
            .then((storagePath) => {
                return storageInstance.read({path: storagePath});
            })
            .then((originalImageBuffer) => {
                if (originalImageBuffer.length <= 0) {
                    throw new NoContentError();
                }
                return imageTransform.resizeFromBuffer(originalImageBuffer, {withoutEnlargement: requestUrlFileExtension !== '.svg', ...imageDimensionConfig, format});
            })
            .then((resizedImageBuffer) => {
                return storageInstance.saveRaw(resizedImageBuffer, req.url);
            });
    }).then(() => {
        if (format) {
            // File extension won't match the new format, so we need to update the Content-Type header manually here
            // Express JS still uses an out of date mime package, which doesn't support avif
            res.type(format === 'avif' ? 'image/avif' : format);
        }
        next();
    }).catch(function (err) {
        if (err.code === 'SHARP_INSTALLATION' || err.code === 'IMAGE_PROCESSING' || err.errorType === 'NoContentError') {
            return redirectToOriginal();
        }
        next(err);
    });
};
