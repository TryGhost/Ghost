const _ = require('lodash');
const path = require('path');
const imageTransform = require('@tryghost/image-transform');
const storage = require('../../../adapters/storage');
const activeTheme = require('../../../../frontend/services/themes/active');
const config = require('../../../../shared/config');

const SIZE_PATH_REGEX = /^\/size\/([^/]+)\//;
const TRAILING_SLASH_REGEX = /\/+$/;

module.exports = function (req, res, next) {
    if (!SIZE_PATH_REGEX.test(req.url)) {
        return next();
    }

    if (TRAILING_SLASH_REGEX.test(req.url)) {
        return next();
    }

    const [sizeImageDir, requestedDimension] = req.url.match(SIZE_PATH_REGEX);
    const redirectToOriginal = () => {
        const url = req.originalUrl.replace(`/size/${requestedDimension}`, '');
        return res.redirect(url);
    };

    const requestUrlFileExtension = path.parse(req.url).ext;

    // CASE: no file extension was given
    if (requestUrlFileExtension === '') {
        return next();
    }

    // CASE: image transform is not capable of transforming file (e.g. .gif)
    if (!imageTransform.canTransformFileExtension(requestUrlFileExtension)) {
        return redirectToOriginal();
    }

    const contentImageSizes = config.get('imageOptimization:contentImageSizes');
    const themeImageSizes = activeTheme.get().config('image_sizes');
    const imageSizes = _.merge({}, themeImageSizes, contentImageSizes);

    // CASE: no image_sizes config (NOTE - unlikely to be reachable now we have content sizes)
    if (!imageSizes) {
        return redirectToOriginal();
    }

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

    const storageInstance = storage.getStorage();
    // CASE: unsupported storage adapter
    if (typeof storageInstance.saveRaw !== 'function') {
        return redirectToOriginal();
    }

    storageInstance.exists(req.url).then((exists) => {
        if (exists) {
            return;
        }

        // exit early if sharp isn't installed to avoid extra file reads
        if (!imageTransform.canTransformFiles()) {
            return redirectToOriginal();
        }

        const imagePath = path.relative(sizeImageDir, req.url);
        const {dir, name, ext} = path.parse(imagePath);
        const [imageNameMatched, imageName, imageNumber] = name.match(/^(.+?)(-\d+)?$/) || [null];

        if (!imageNameMatched) {
            // CASE: Image name does not contain any characters?
            // RESULT: Hand off to `next()` which will 404
            return;
        }
        const unoptimizedImagePath = path.join(dir, `${imageName}_o${imageNumber || ''}${ext}`);

        return storageInstance.exists(unoptimizedImagePath)
            .then((unoptimizedImageExists) => {
                if (unoptimizedImageExists) {
                    return unoptimizedImagePath;
                }
                return imagePath;
            })
            .then((storagePath) => {
                return storageInstance.read({path: storagePath});
            })
            .then((originalImageBuffer) => {
                return imageTransform.resizeFromBuffer(originalImageBuffer, imageDimensionConfig);
            })
            .then((resizedImageBuffer) => {
                return storageInstance.saveRaw(resizedImageBuffer, req.url);
            });
    }).then(() => {
        next();
    }).catch(function (err) {
        if (err.code === 'SHARP_INSTALLATION') {
            return redirectToOriginal();
        }
        next(err);
    });
};
