const Promise = require('bluebird');
const common = require('../common');

const getTypeByExtension = (ext) => {
    if (['.jpg', '.jpeg'].includes(ext)) {
        return 'jpeg';
    } else {
        return null;
    }
};

const resize = (img, options) => {
    img.resize(options.width);
};

/**
 * @NOTE
 * for png format we don't want to use any compression method as it's meant to be used as lossless format
 */
const compress = (img, options = {quality: 80}) => {
    const type = getTypeByExtension(options.ext);

    if (!type || type !== 'jpeg') {
        return;
    }

    img.jpeg({quality: options.quality});
};

const keepMetadata = (img) => {
    return img.withMetadata();
};

/**
 * @NOTE: Sharp cannot operate on the same image path, that's why we have to use in & out paths.
 */
const process = (options = {}) => {
    let sharp, img;

    try {
        sharp = require('sharp');
        img = sharp(options.in);
    } catch (err) {
        return Promise.reject(new common.errors.InternalServerError({
            message: 'Sharp could not be installed',
            code: 'SHARP_INSTALLATION',
            err: err
        }));
    }

    if (options.resize) {
        resize(img, options);
    }

    if (options.compress) {
        compress(img, options);
    }

    if (!options.stripMetadata) {
        keepMetadata(img);
    }

    if (options.out) {
        return img.toFile(options.out);
    } else {
        return img.toBuffer();
    }
};

module.exports.process = process;
