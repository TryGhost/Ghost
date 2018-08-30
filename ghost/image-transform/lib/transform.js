const Promise = require('bluebird');
const common = require('../common');

/**
 * @NOTE: Sharp cannot operate on the same image path, that's why we have to use in & out paths.
 *
 * We currently can't enable compression or having more config options, because of
 * https://github.com/lovell/sharp/issues/1360.
 */
const process = (options = {}) => {
    let sharp, img;

    try {
        sharp = require('sharp');

        // @NOTE: workaround for Windows as libvips keeps a reference to the input file
        //        which makes it impossible to fs.unlink() it on cleanup stage
        sharp.cache(false);
        img = sharp(options.in);
    } catch (err) {
        return Promise.reject(new common.errors.InternalServerError({
            message: 'Sharp wasn\'t installed',
            code: 'SHARP_INSTALLATION',
            err: err
        }));
    }

    return img.metadata()
        .then((metadata) => {
            if (metadata.width > options.width) {
                img.resize(options.width);
            }

            // CASE: if you call `rotate` it will automatically remove the orientation (and all other meta data) and rotates
            //       based on the orientation. It does not rotate if no orientation is set.
            img.rotate();
        })
        .then(() => {
            return img.toFile(options.out);
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
