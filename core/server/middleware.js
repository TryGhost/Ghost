
var _ = require('underscore'),
    express = require('express'),
    path = require('path');

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.txt', '.json'],
        ext = path.extname(file);
    return _.contains(blackListedFileTypes, ext);
}

var middleware = {

    staticTheme: function (g) {
        var ghost = g;
        return function blackListStatic(req, res, next) {
            if (isBlackListedFileType(req.url)) {
                return next();
            }

            return middleware.forwardToExpressStatic(ghost, req, res, next);
        };
    },

    // to allow unit testing
    forwardToExpressStatic: function (ghost, req, res, next) {
        return express['static'](ghost.paths().activeTheme)(req, res, next);
    }
};

module.exports = middleware;
