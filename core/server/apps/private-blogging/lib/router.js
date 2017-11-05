var path                = require('path'),
    express             = require('express'),
    middleware          = require('./middleware'),
    bodyParser          = require('body-parser'),
    templates           = require('../../../controllers/frontend/templates'),
    setResponseContext  = require('../../../controllers/frontend/context'),
    renderer            = require('../../../controllers/frontend/renderer'),
    brute               = require('../../../middleware/brute'),

    templateName = 'private',
    defaultTemplate = path.resolve(__dirname, 'views', templateName + '.hbs'),

    privateRouter = express.Router();

function _renderer(req, res) {
    // Renderer begin
    // Format data
    var data = {};

    if (res.error) {
        data.error = res.error;
    }

    // Context
    setResponseContext(req, res);

    // Template
    // @TODO make a function that can do the different template calls
    res.template = templates.pickTemplate(templateName, defaultTemplate);

    // Render Call
    return renderer(req, res, data);
}

// password-protected frontend route
privateRouter.route('/')
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
