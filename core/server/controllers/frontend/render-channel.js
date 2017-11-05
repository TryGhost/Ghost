var debug = require('ghost-ignition').debug('channels:render'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer'),
    setResponseContext = require('./context'),
    templates = require('./templates');

module.exports = function renderChannel(req, res) {
    debug('renderChannel called');
    return function renderChannel(result) {
        // Renderer begin
        // Format data 2
        // Do final data formatting and then render
        var data = formatResponse.channel(result);

        // Context
        setResponseContext(req, res);

        // Template
        // @TODO make a function that can do the different template calls
        res.template = templates.channel(res.locals.channel);

        // Render Call
        return renderer(req, res, data);
    };
};
