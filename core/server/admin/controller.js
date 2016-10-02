var debug = require('debug')('ghost:admin:controller'),
    logging = require('../logging'),
    updateCheck = require('./lib/update-check'),
    loadConfig = require('./lib/load-config');

// Route: index
// Path: /ghost/
// Method: GET
module.exports = function adminController(req, res, next) {
    debug('index called');

    function renderIndex() {
        loadConfig().then(function renderPage(configuration) {
            debug('rendering default template');
            res.render('default', {
                configuration: configuration
            });
        }).catch(next);
    }

    updateCheck().catch(logging.logError).finally(function noMatterWhat() {
        renderIndex();
    });
};
