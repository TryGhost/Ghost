const path = require('path');
const express = require('../../../../shared/express');
const middleware = require('./middleware');
const bodyParser = require('body-parser');
const routing = require('../../../services/routing');
const web = require('../../../../server/web');
const templateName = 'private';
const privateRouter = express.Router(templateName);

function _renderer(req, res) {
    res.routerOptions = {
        type: 'custom',
        templates: templateName,
        defaultTemplate: path.resolve(__dirname, 'views', `${templateName}.hbs`)
    };

    // Renderer begin
    // Format data
    let data = {};

    if (res.error) {
        data.error = res.error;
    }

    // Render Call
    return routing.helpers.renderer(req, res, data);
}

// password-protected frontend route
privateRouter
    .route('/')
    .get(
        middleware.redirectPrivateToHomeIfLoggedIn,
        _renderer
    )
    .post(
        bodyParser.urlencoded({extended: true}),
        middleware.redirectPrivateToHomeIfLoggedIn,
        web.shared.middlewares.brute.privateBlog,
        middleware.doLoginToPrivateSite,
        _renderer
    );

module.exports = privateRouter;
module.exports.renderer = _renderer;
