var debug = require('ghost-ignition').debug('channels:render'),
    formatResponse = require('./format-response'),
    setResponseContext = require('./context'),
    templates = require('./templates');

module.exports = function renderChannel(req, res) {
    debug('renderChannel called');
    return function renderChannel(result) {
        var view = templates.channel(res.locals.channel);

        result = formatResponse.channel(result);

        setResponseContext(req, res);
        debug('Rendering view: ' + view);
        res.render(view, result);
    };
};
