const debug = require('ghost-ignition').debug('web:admin:controller');
const path = require('path');
const config = require('../../config');
const updateCheck = require('../../update-check');
const common = require('../../lib/common');

// Route: index
// Path: /ghost/
// Method: GET
module.exports = function adminController(req, res) {
    debug('index called');

    // run in background, don't block the admin rendering
    updateCheck()
        .catch((err) => {
            common.logging.error(err);
        });

    const defaultTemplate = config.get('env') === 'production' ? 'default-prod.html' : 'default.html';
    const templatePath = path.resolve(config.get('paths').adminViews, defaultTemplate);

    res.sendFile(templatePath);
};
