const config = require('../../../config');
const common = require('../../../lib/common');
const image = require('../../../lib/image');

module.exports = function normalize(req, res, next) {
    const out = `${req.file.path}_processed`;
    const options = Object.assign({
        in: req.file.path,
        out,
        ext: req.file.ext,
        quality: 80,
        width: 2000
    }, config.get('imageOptimization'));

    image.manipulator.process(options)
        .then(() => {
            req.file.path = out;
            next();
        })
        .catch((err) => {
            common.logging.error(new common.errors.InternalServerError({
                err: err,
                context: `${req.file.name} / ${req.file.type}`,
                code: 'IMAGE_NORMALIZATION'
            }));

            next();
        });
};
