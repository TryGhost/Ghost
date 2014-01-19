// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var _       = require('underscore'),
    express = require('express'),
    fs      = require('fs-extra'),
    nodefn  = require('when/node/function'),
    path    = require('path'),
    when    = require('when'),
    errors  = require('../errorHandling'),
    configPaths = require('../config/paths'),
    baseStore   = require('./base'),

    localFileStore;

localFileStore = _.extend(baseStore, {
    // ### Save
    // Saves the image to storage (the file system)
    // - image is the express image object
    // - returns a promise which ultimately returns the full url to the uploaded image
    'save': function (image) {
        var saved = when.defer(),
            targetDir = this.getTargetDir(configPaths().imagesPath),
            targetFilename;

        this.getUniqueFileName(this, image, targetDir).then(function (filename) {
            targetFilename = filename;
            return nodefn.call(fs.mkdirs, targetDir);
        }).then(function () {
            return nodefn.call(fs.copy, image.path, targetFilename);
        }).then(function () {
            return nodefn.call(fs.unlink, image.path).otherwise(errors.logError);
        }).then(function () {
            // The src for the image must be in URI format, not a file system path, which in Windows uses \
            // For local file system storage can use relative path so add a slash
            var fullUrl = (configPaths().subdir + '/' + path.relative(configPaths().appRoot, targetFilename)).replace(new RegExp('\\' + path.sep, 'g'), '/');
            return saved.resolve(fullUrl);
        }).otherwise(function (e) {
            errors.logError(e);
            return saved.reject(e);
        });

        return saved.promise;
    },

    'exists': function (filename) {
        // fs.exists does not play nicely with nodefn because the callback doesn't have an error argument
        var done = when.defer();

        fs.exists(filename, function (exists) {
            done.resolve(exists);
        });

        return done.promise;
    },

    // middleware for serving the files
    'serve': function () {
        var ONE_HOUR_MS = 60 * 60 * 1000,
            ONE_YEAR_MS = 365 * 24 * ONE_HOUR_MS;

        // For some reason send divides the max age number by 1000
        return express['static'](configPaths().imagesPath, {maxAge: ONE_YEAR_MS});
    }
});

module.exports = localFileStore;
