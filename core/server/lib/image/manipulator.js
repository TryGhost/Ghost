const Promise = require('bluebird');
const common = require('../common');
const fs = require('fs-extra');
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminOptipng = require('imagemin-optipng');
/**
 * @NOTE: Sharp cannot operate on the same image path, that's why we have to use in & out paths.
 *
 * We currently can't enable compression or having more config options, because of
 * https://github.com/lovell/sharp/issues/1360.
 */

const optimizeAndWrite = ((path, buffer) => imagemin.buffer(buffer, 
    {plugins: [imageminJpegtran(), imageminOptipng()]})
    .then(optBuff => fs.writeFile(path, optBuff)).then(() => true)
);

const process = (options = {}) => {
    let sharp, img, originalData, originalWidth;

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
    //        **Added check if it's not in windows, to use cache for the operations and enhance the file size reduction.**
    if (process.platform === 'win32'){
        sharp.cache(false);
    }
    return fs.readFile(options.in)
        .then((data) => {
            originalData = data;
            // @NOTE: have to use constructor with Buffer for sharp to be able to expose width property
            img = sharp(data);
        })
        .then(() => img.metadata())
        .then((metadata) => {
            originalWidth = metadata.width;
            // CASE: kernel: nearest -> the file size doesn't increase at all with this algorithm. And does 
            //       the best compression sizes. withoutEnlargement: true -> sharp detects if options.width is bigger
            //       than the original image and discards the resize operation.
            img.resize({width: options.width, kernel: sharp.kernel.nearest, withoutEnlargement: true});
            // CASE: if you call `rotate` it will automatically remove the orientation (and all other meta data) and rotates
            //       based on the orientation. It does not rotate if no orientation is set.
            img.rotate();
            return img.toBuffer();
        })
        .then((data) => {
            if (data.length > originalData.length && options.width === 2000) {
                return optimizeAndWrite(options.out, originalData);
            } else if (options.width !== 2000 && originalWidth <= options.width) {
                return Promise.resolve(false);
            } else {
                return optimizeAndWrite(options.out, data);
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

module.exports.process = process;
