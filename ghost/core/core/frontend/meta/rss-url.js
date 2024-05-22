const routingService = require('../services/routing');

function getRssUrl(data, absolute) {
    return routingService.registry.getRssUrl({
        absolute: absolute
    });
}

module.exports = getRssUrl;
