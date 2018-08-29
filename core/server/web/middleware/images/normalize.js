const fs = require('fs');
const config = require('../../../config');
const common = require('../../../lib/common');
const image = require('../../../lib/image');

module.exports = function normalize(req, res, next) {
    const out = `${req.file.path}_processed`;
    const original = req.file.path;

    const options = Object.assign({
        in: original,
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
            err.context = `${req.file.name} / ${req.file.type}`;
            common.logging.error(err);
            next();
        })
        .finally(() => {
            // The path to original file is being overwritten, so cleanup needs to happen here
            fs.unlink(original);
        });
};
