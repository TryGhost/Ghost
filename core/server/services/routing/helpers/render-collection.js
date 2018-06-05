const debug = require('ghost-ignition').debug('services:routing:helpers:render-collection'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer');

module.exports = function renderCollection(req, res) {
    debug('renderCollection called');
    return function renderCollection(result) {
        // Format data 2
        // Render
        return renderer(req, res, formatResponse.collection(result));
    };
};
