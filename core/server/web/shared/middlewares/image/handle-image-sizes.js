const path = require('path');
const sharp = require('sharp');
const storage = require('../../../../adapters/storage');
const activeTheme = require('../../../../services/themes/active');

const SIZE_PATH_REGEX = /^\/size\/([^/]+)\//;

module.exports = function (req, res, next) {
    if (!SIZE_PATH_REGEX.test(req.url)) {
        return next();
    }

    const imageSizes = activeTheme.get().config('image_sizes');

    const [sizeImageDir, requestedSize] = req.url.match(SIZE_PATH_REGEX);

    // CASE: unknown size or missing size config
    const imageSizeConfig = imageSizes[requestedSize];
    if (!imageSizeConfig || (!imageSizeConfig.width && !imageSizeConfig.height)) {
        const url = req.originalUrl.replace(`/size/${requestedSize}`, '');
        return res.redirect(url);
    }

    const storageInstance = storage.getStorage();
    // CASE: unsupported storage adapter but theme is using custom image_sizes
    if (typeof storageInstance.saveRaw !== 'function') {
        const url = req.originalUrl.replace(`/size/${requestedSize}`, '');
        return res.redirect(url);
    }

    storageInstance.exists(req.url).then((exists) => {
        if (exists) {
            return;
        }

        const originalImagePath = path.relative(sizeImageDir, req.url);

        return storageInstance.read({path: originalImagePath})
            .then((originalImageBuffer) => {
                return sharp(originalImageBuffer)
                    .resize(imageSizeConfig.width, imageSizeConfig.height, {
                        withoutEnlargement: true
                    })
                    .toBuffer();
            })
            .then((resizedImageBuffer) => {
                return storageInstance.saveRaw(resizedImageBuffer, req.url);
            });
    }).then(() => {
        next();
    }).catch(next);
};
