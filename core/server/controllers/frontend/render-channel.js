var debug = require('ghost-ignition').debug('channels:render'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer'),
    setResponseContext = require('./context');

module.exports = function renderChannel(req, res) {
    debug('renderChannel called');
    return function renderChannel(result) {
        // Renderer begin
        // Format data 2
        // Do final data formatting and then render
        var data = formatResponse.channel(result);

        // Context
        setResponseContext(req, res);

        // Render Call
        return renderer(req, res, data);
    };
};
