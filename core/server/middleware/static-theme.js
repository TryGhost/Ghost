var _       = require('lodash'),
    express = require('express'),
    path    = require('path'),
    config  = require('../config'),
    utils   = require('../utils');

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json'],
        ext = path.extname(file);
    return _.includes(blackListedFileTypes, ext);
}

function isWhiteListedFile(file) {
    var whiteListedFiles = ['manifest.json'],
        base = path.basename(file);
    return _.includes(whiteListedFiles, base);
}

function forwardToExpressStatic(req, res, next) {
    if (!req.app.get('activeTheme')) {
        next();
    } else {
        express.static(
            path.join(config.getContentPath('themes'), req.app.get('activeTheme')),
            {maxAge: config.get('env') === 'development' ? 0 : utils.ONE_YEAR_MS}
        )(req, res, next);
    }
}

function staticTheme() {
    return function blackListStatic(req, res, next) {
        if (!isWhiteListedFile(req.path) && isBlackListedFileType(req.path)) {
            return next();
        }
        return forwardToExpressStatic(req, res, next);
    };
}

module.exports = staticTheme;
