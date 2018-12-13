const Promise = require('bluebird');
const common = require('../common');
const fs = require('fs-extra');

/**
 * @NOTE: Sharp cannot operate on the same image path, that's why we have to use in & out paths.
 *
 * We currently can't enable compression or having more config options, because of
 * https://github.com/lovell/sharp/issues/1360.
 */
const process = (options = {}) => {
    let sharp, img, originalData, originalSize;

    try {
        sharp = require('sharp');
    } catch (err) {
        return Promise.reject(new common.errors.InternalServerError({
            message: 'Sharp wasn\'t installed',
            code: 'SHARP_INSTALLATION',
            err: err
        }));
    }

    // @NOTE: workaround for Windows as libvips keeps a reference to the input file
    //        which makes it impossible to fs.unlink() it on cleanup stage
    sharp.cache(false);

    return fs.readFile(options.in)
        .then((data) => {
            originalData = data;

            // @NOTE: have to use constructor with Buffer for sharp to be able to expose size property
            img = sharp(data);
        })
        .then(() => img.metadata())
        .then((metadata) => {
            originalSize = metadata.size;

            if (metadata.width > options.width) {
                img.resize(options.width);
            }

            // CASE: if you call `rotate` it will automatically remove the orientation (and all other meta data) and rotates
            //       based on the orientation. It does not rotate if no orientation is set.
            img.rotate();
            return img.toBuffer({resolveWithObject: true});
        })
        .then(({data, info}) => {
            if (info.size > originalSize) {
                return fs.writeFile(options.out, originalData);
            } else {
                return fs.writeFile(options.out, data);
            }
        })
        .catch((err) => {
            throw new common.errors.InternalServerError({
                message: 'Unable to manipulate image.',
                err: err,
                code: 'IMAGE_PROCESSING'
            });
        });
};

const resizeImage = (originalBuffer, {width, height} = {}) => {
    const sharp = require('sharp');
    return sharp(originalBuffer)
        .resize(width, height, {
            // CASE: dont make the image bigger than it was
            withoutEnlargement: true
        })
        // CASE: Automatically remove metadata and rotate based on the orientation.
        .rotate()
        .toBuffer()
        .then((resizedBuffer) => {
            return resizedBuffer.length < originalBuffer.length ? resizedBuffer : originalBuffer;
        });
};

module.exports.process = process;
module.exports.safeResizeImage = (buffer, options) => {
    try {
        require('sharp');
        return resizeImage(buffer, options);
    } catch (e) {
        return Promise.resolve(buffer);
    }
};
