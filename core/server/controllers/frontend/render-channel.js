var debug = require('ghost-ignition').debug('channels:render'),
    formatResponse = require('./format-response'),
    setResponseContext = require('./context'),
    templates = require('./templates');

module.exports = function renderChannel(req, res) {
    debug('renderChannel called');
    return function renderChannel(result) {
        // Renderer begin
        // Format data 2
        // Do final data formatting and then render
        result = formatResponse.channel(result);

        // Context
        setResponseContext(req, res);

        // Template
        res.template = templates.channel(res.locals.channel);

        // Render Call
        debug('Rendering view: ' + res.template);
        res.render(res.template, result);
    };
};
