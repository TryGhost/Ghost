const path = require('path');
const config = require('../../../shared/config');

function servePreview(req, res, next) {
    if (req.path === '/') {
        const templatePath = path.resolve(config.get('paths').adminViews, 'preview.html');
        return res.sendFile(templatePath);
    }

    next();
}

module.exports = [
    servePreview
];
