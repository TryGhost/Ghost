var errors    = require('../errors'),
    validator = require('validator'),
    config    = require('../config'),
    pushHub;

pushHub = {
    validateContentType: function validateCallback(req, res, next) {
        if (req.get('Content-Type') !== 'application/x-www-form-urlencoded') {
            var err = new errors.ValidationError('Content-Type is invalid');

            return errors.sendPlainTextError(err, req, res, next);
        }

        return next();
    },
    validateCallback: function validateCallback(req, res, next) {
        var err;

        if (! req.body['hub.callback']) {
            err = new errors.ValidationError('hub.callback request parameter missing or empty');

            return errors.sendPlainTextError(err, req, res, next);
        }

        if (! validator.isURL(req.body['hub.callback'])) {
            err = new errors.ValidationError('hub.callback request parameter is invalid');

            return errors.sendPlainTextError(err, req, res, next);
        }

        return next();
    },
    validateTopic: function validateTopic(req, res, next) {
        var err;

        if (! req.body['hub.topic']) {
            err = new errors.ValidationError('hub.topic request parameter missing or empty');

            return errors.sendPlainTextError(err, req, res, next);
        }

        if (! validator.isRssFeed(req.body['hub.topic'])) {
            err = new errors.ValidationError('hub.topic request parameter is invalid');

            return errors.sendPlainTextError(err, req, res, next);
        }

        return next();
    },
    validateHubMode: function validateHubMode(req, res, next) {
        var err;

        if (! req.body['hub.mode']) {
            err = new errors.ValidationError('hub.mode request parameter missing or empty');

            return errors.sendPlainTextError(err, req, res, next);
        }

        if (! req.body['hub.mode'].match(/^(unsubscribe|subscribe)$/)) {
            err = new errors.ValidationError('hub.mode request parameter is invalid');

            return errors.sendPlainTextError(err, req, res, next);
        }

        return next();
    }
};

module.exports = pushHub;
