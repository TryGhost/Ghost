const routingService = require('../../../frontend/services/routing');

function getRssUrl(data, absolute) {
    return routingService.registry.getRssUrl({
        secure: data.secure,
        absolute: absolute
    });
}

module.exports = getRssUrl;
