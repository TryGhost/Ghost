var _       = require('lodash'),
    express = require('express'),
    path    = require('path'),
    config  = require('../config'),
    utils   = require('../utils');

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json'],
        ext = path.extname(file);
    return _.contains(blackListedFileTypes, ext);
}

function forwardToExpressStatic(req, res, next) {
    if (!req.app.get('activeTheme')) {
        next();
    } else {
        express.static(
            path.join(config.paths.themePath, req.app.get('activeTheme')),
            {maxAge: utils.ONE_YEAR_MS}
        )(req, res, next);
    }
}

function staticTheme() {
    return function blackListStatic(req, res, next) {
        if (isBlackListedFileType(req.url)) {
            return next();
        }
        return forwardToExpressStatic(req, res, next);
    };
}

module.exports = staticTheme;
