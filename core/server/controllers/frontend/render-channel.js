var debug = require('ghost-ignition').debug('channels:render'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer');

module.exports = function renderChannel(req, res) {
    debug('renderChannel called');
    return function renderChannel(result) {
        // Renderer begin
        // Format data 2
        // Do final data formatting and then render
        var data = formatResponse.channel(result);

        // Render Call
        return renderer(req, res, data);
    };
};
