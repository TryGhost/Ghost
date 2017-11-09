var debug = require('ghost-ignition').debug('channels:render-post'),
    templates = require('./templates'),
    formatResponse = require('./format-response'),
    setResponseContext = require('./context');
/*
 * Sets the response context around an entry (post or page)
 * and renders it with the correct template.
 * Used by post preview and entry methods.
 * Returns a function that takes the entry to be rendered.
 */
module.exports = function renderEntry(req, res) {
    debug('renderEntry called');
    return function renderEntry(entry) {
        // Renderer begin
        // Format data 2 - 1 is in preview/entry
        var response = formatResponse.entry(entry);

        // Context
        setResponseContext(req, res, response);

        // Template
        res.template = templates.entry(entry);

        // Render Call
        debug('Rendering view: ' + res.template);
        res.render(res.template, response);
    };
};
