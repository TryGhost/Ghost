const path = require('path');
const config = require('../../../shared/config');
const constants = require('@tryghost/constants');
const themeEngine = require('../../services/theme-engine');
const express = require('../../../shared/express');

function isDeniedFile(file) {
    const deniedFileTypes = ['.hbs', '.md', '.json', '.lock', '.log'];
    const deniedFiles = ['gulpfile.js', 'gruntfile.js'];

    const ext = path.extname(file);
    const base = path.basename(file);

    return deniedFiles.includes(base) || deniedFileTypes.includes(ext);
}

function isAllowedFile(file) {
    const allowedFiles = ['manifest.json'];
    const allowedPath = '/assets/';
    const alwaysDeny = ['.hbs'];

    const ext = path.extname(file);
    const base = path.basename(file);

    return allowedFiles.includes(base) || (file.startsWith(allowedPath) && !alwaysDeny.includes(ext));
}

function forwardToExpressStatic(req, res, next) {
    if (!themeEngine.getActive()) {
        return next();
    }

    const configMaxAge = config.get('caching:theme:maxAge');

    // @NOTE: the maxAge config passed below are in milliseconds and the config
    //        is specified in seconds. See https://github.com/expressjs/serve-static/issues/150 for more context
    express.static(themeEngine.getActive().path, {
        maxAge: (configMaxAge || configMaxAge === 0) ? configMaxAge : constants.ONE_YEAR_MS
    }
    )(req, res, next);
}

function staticTheme() {
    return function denyStatic(req, res, next) {
        if (!isAllowedFile(req.path.toLowerCase()) && isDeniedFile(req.path.toLowerCase())) {
            return next();
        }

        return forwardToExpressStatic(req, res, next);
    };
}

module.exports = staticTheme;
