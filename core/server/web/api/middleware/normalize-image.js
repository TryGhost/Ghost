const cloneDeep = require('lodash/cloneDeep');
const config = require('../../../../shared/config');
const logging = require('../../../../shared/logging');
const imageTransform = require('@tryghost/image-transform');

module.exports = function normalize(req, res, next) {
    const imageOptimizationOptions = config.get('imageOptimization');

    // CASE: image transform is not capable of transforming file (e.g. .gif)
    if (!imageTransform.canTransformFileExtension(req.file.ext) || !imageOptimizationOptions.resize) {
        return next();
    }

    const out = `${req.file.path}_processed`;
    const originalPath = req.file.path;

    const options = Object.assign({
        in: originalPath,
        out,
        ext: req.file.ext,
        width: 2000
    }, imageOptimizationOptions);

    imageTransform.resizeFromPath(options)
        .then(() => {
            req.files = [];

            // CASE: push the processed/optimised image
            req.files.push(Object.assign(req.file, {path: out}));

            // CASE: push original image, we keep a copy of it
            const newName = imageTransform.generateOriginalImageName(req.file.name);
            req.files.push(Object.assign(cloneDeep(req.file), {path: originalPath, name: newName}));

            next();
        })
        .catch((err) => {
            err.context = `${req.file.name} / ${req.file.type}`;
            logging.error(err);
            next();
        });
};
