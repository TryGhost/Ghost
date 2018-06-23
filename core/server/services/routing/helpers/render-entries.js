const debug = require('ghost-ignition').debug('services:routing:helpers:render-entries'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer');

module.exports = function renderEntries(req, res) {
    debug('renderEntries called');
    return function renderEntries(result) {
        // Format data 2
        // Render
        return renderer(req, res, formatResponse.entries(result));
    };
};
