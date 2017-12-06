var path                = require('path'),
    express             = require('express'),
    middleware          = require('./middleware'),
    bodyParser          = require('body-parser'),
    renderer            = require('../../../controllers/frontend/renderer'),
    brute               = require('../../../web/middleware/brute'),

    templateName = 'private',

    privateRouter = express.Router();

function _renderer(req, res) {
    // Note: this is super similar to the config middleware used in channels
    // @TODO refactor into to something explicit & DRY this up
    res._route = {
        type: 'custom',
        templateName: templateName,
        defaultTemplate: path.resolve(__dirname, 'views', templateName + '.hbs')
    };

    // Renderer begin
    // Format data
    var data = {};

    if (res.error) {
        data.error = res.error;
    }

    // Render Call
    return renderer(req, res, data);
}

// password-protected frontend route
privateRouter
    .route('/')
    .get(
        middleware.isPrivateSessionAuth,
        _renderer
    )
    .post(
        bodyParser.urlencoded({extended: true}),
        middleware.isPrivateSessionAuth,
        brute.privateBlog,
        middleware.authenticateProtection,
        _renderer
    );

module.exports = privateRouter;
module.exports.renderer = _renderer;
