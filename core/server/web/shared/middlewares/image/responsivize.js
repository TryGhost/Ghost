const cloneDeep = require('lodash/cloneDeep');
const path = require('path');
const config = require('../../../../config');
const common = require('../../../../lib/common');
const image = require('../../../../lib/image');

module.exports = function normalize(req, res, next) {
    const imageOptimizationOptions = config.get('imageOptimization');
    // NOTE: .gif optimization is currently not supported by sharp but will be soon
    //       as there has been support added in underlying libvips library https://github.com/lovell/sharp/issues/1372
    //       As for .svg files, sharp only supports conversion to png, and this does not
    //       play well with animated svg files
    if (!imageOptimizationOptions.resize || ['.gif', '.svg', '.svgz'].includes(req.file.ext)) {
        return next();
    }
    const isProfilePic = req.route.path === '/uploads/profile-image';
    const originalPath = req.file.path;
    req.files = [];
    const parsedFileName = path.parse(req.file.name);
    const options = {
        in: originalPath,
        ext: req.file.ext
    };
    const widths = [...new Set(imageOptimizationOptions.responsive.enabled && !isProfilePic ? 
        Object
            .keys(imageOptimizationOptions.responsive.widths)
            .map(w => imageOptimizationOptions.responsive.widths[w])
            .filter(w => w > 0 && Math.floor(w) === +w)
            .sort((a,b) => b - a) : [])];
    widths.unshift(2000);
    const imgSizes = widths.map(w => image.manipulator
        .process(Object.assign(cloneDeep(options), {out: `${originalPath}_${w}`, width: w}))
        .then((didResize) => {
            const newName = w === 2000 ? req.file.name : `${parsedFileName.name}-${w}${parsedFileName.ext}`;
            if (didResize) {
                req.files.push(Object.assign(cloneDeep(req.file), 
                    {
                        path: `${originalPath}_${w}`,
                        name: newName
                    }
                )); 
            }
            return Promise.resolve();
        })
    );
    Promise
        .all(imgSizes)
        .then(() => {
            if (imageOptimizationOptions.deleteOriginal) {
                require('fs-extra').unlink(originalPath);
            } else {
                const newName = `${parsedFileName.name}_o${parsedFileName.ext}`;
                req.files.push(Object.assign(cloneDeep(req.file), {path: originalPath, name: newName}));
            }
            next();
        })
        .catch((err) => {
            err.context = `${req.file.name} / ${req.file.type}`;
            common.logging.error(err);
            next();
        });
};
