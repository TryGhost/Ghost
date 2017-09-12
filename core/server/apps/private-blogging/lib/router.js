var path                = require('path'),
    express             = require('express'),
    middleware          = require('./middleware'),
    bodyParser          = require('body-parser'),
    templates           = require('../../../controllers/frontend/templates'),
    setResponseContext  = require('../../../controllers/frontend/context'),
    brute               = require('../../../middleware/brute'),

    privateRouter = express.Router();

function controller(req, res) {
    var templateName = 'private',
        defaultTemplate = path.resolve(__dirname, 'views', templateName + '.hbs'),
        view = templates.pickTemplate(templateName, defaultTemplate),
        data = {};

    if (res.error) {
        data.error = res.error;
    }

    setResponseContext(req, res);

    return res.render(view, data);
}

// password-protected frontend route
privateRouter.route('/')
    .get(
        middleware.isPrivateSessionAuth,
        controller
    )
    .post(
        bodyParser.urlencoded({extended: true}),
        middleware.isPrivateSessionAuth,
        brute.privateBlog,
        middleware.authenticateProtection,
        controller
    );

module.exports = privateRouter;
module.exports.controller = controller;
