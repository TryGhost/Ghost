const debug = require('ghost-ignition').debug('admin:controller'),
    path = require('path'),
    config = require('../../config'),
    updateCheck = require('../../update-check'),
    common = require('../../lib/common');

// Route: index
// Path: /ghost/
// Method: GET
module.exports = function adminController(req, res) {
    debug('index called');

    // run in background, don't block the admin rendering
    updateCheck()
        .catch(function onError(err) {
            common.logging.error(err);
        });

    let defaultTemplate = config.get('env') === 'production' ? 'default-prod.html' : 'default.html',
        templatePath = path.resolve(config.get('paths').adminViews, defaultTemplate);

    res.sendFile(templatePath);
};
