var ghost = require('./index'),
    errors = require('./server/errors');

function ghostMiddleware(options) {
    var app = false,
        requestBuffer = [];

    ghost(options).then(function (blog) {
        app = blog.app;
        while (requestBuffer.length) {
            app.apply(app, requestBuffer.pop());
        }
    }).catch(function (err) {
        errors.logErrorAndExit(err, err.context, err.help);
    });

    return function (req, res) {
        if (app === false) {
            requestBuffer.unshift([req, res]);
        } else {
            app(req, res);
        }
    };
}

module.exports = ghostMiddleware;
