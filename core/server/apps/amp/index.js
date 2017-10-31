var router           = require('./lib/router'),
    registerHelpers  = require('./lib/helpers'),
    config           = require('../../config');

module.exports = {
    activate: function activate(ghost) {
        registerHelpers(ghost);

        ghost.routeService.registerRouter('*/' + config.get('routeKeywords').amp + '/', router);
    }
};
