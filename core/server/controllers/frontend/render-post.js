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
        var view = templates.single(post),
            response = formatResponse.single(post);

        setResponseContext(req, res, response);
        debug('Rendering view: ' + view);
        res.render(view, response);
    };
};
