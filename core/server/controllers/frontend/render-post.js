var debug = require('ghost-ignition').debug('channels:render-post'),
    templates = require('./templates'),
    formatResponse = require('./format-response'),
    setResponseContext = require('./context');
/*
 * Sets the response context around a post and renders it
 * with the current theme's post view. Used by post preview
 * and single post methods.
 * Returns a function that takes the post to be rendered.
 */

module.exports = function renderPost(req, res) {
    debug('renderPost called');
    return function renderPost(post) {
        // Renderer begin
        // Format data 2 - 1 is in preview/single
        var response = formatResponse.single(post);

        // Context
        setResponseContext(req, res, response);

        // Template
        res.template = templates.single(post);

        // Render Call
        debug('Rendering view: ' + res.template);
        res.render(res.template, response);
    };
};
