const path = require('path');
const image = require('../../../../lib/image');
const storage = require('../../../../adapters/storage');
const activeTheme = require('../../../../../frontend/services/themes/active');

const SIZE_PATH_REGEX = /^\/size\/([^/]+)\//;

module.exports = function (req, res, next) {
    if (!SIZE_PATH_REGEX.test(req.url)) {
        return next();
    }

    const [sizeImageDir, requestedDimension] = req.url.match(SIZE_PATH_REGEX);
    const redirectToOriginal = () => {
        const url = req.originalUrl.replace(`/size/${requestedDimension}`, '');
        return res.redirect(url);
    };

    // CASE: image manipulator is uncapable of transforming file (e.g. .gif)
    const requestUrlFileExtension = path.parse(req.url).ext;
    if (!image.manipulator.canTransformFileExtension(requestUrlFileExtension)) {
        return redirectToOriginal();
    }

    const imageSizes = activeTheme.get().config('image_sizes');
    // CASE: no image_sizes config
    if (!imageSizes) {
        return redirectToOriginal();
    }

    const imageDimensions = Object.keys(imageSizes).reduce((dimensions, size) => {
        const {width, height} = imageSizes[size];
        const dimension = (width ? 'w' + width : '') + (height ? 'h' + height : '');
        return Object.assign({
            [dimension]: imageSizes[size]
        }, dimensions);
    }, {});

    const imageDimensionConfig = imageDimensions[requestedDimension];
    // CASE: unknown dimension
    if (!imageDimensionConfig || (!imageDimensionConfig.width && !imageDimensionConfig.height)) {
        return redirectToOriginal();
    }

    const storageInstance = storage.getStorage();
    // CASE: unsupported storage adapter but theme is using custom image_sizes
    if (typeof storageInstance.saveRaw !== 'function') {
        return redirectToOriginal();
    }

    storageInstance.exists(req.url).then((exists) => {
        if (exists) {
            return;
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
            .then((path) => {
                return storageInstance.read({path});
            })
            .then((originalImageBuffer) => {
                return image.manipulator.resizeImage(originalImageBuffer, imageDimensionConfig);
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
