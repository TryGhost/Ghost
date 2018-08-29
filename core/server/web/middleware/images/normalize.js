const fs = require('fs-extra');
const config = require('../../../config');
const common = require('../../../lib/common');
const image = require('../../../lib/image');

module.exports = function normalize(req, res, next) {
    const out = `${req.file.path}_processed`;
    const originalPath = req.file.path;

    const options = Object.assign({
        in: originalPath,
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
        });
};
