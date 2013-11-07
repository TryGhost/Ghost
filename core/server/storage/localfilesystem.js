// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var _       = require('underscore'),
    express = require('express'),
    fs      = require('fs-extra'),
    nodefn  = require('when/node/function'),
    path    = require('path'),
    when    = require('when'),
    errors  = require('../errorHandling'),
    baseStore   = require('./base'),

    localFileStore,
    localDir = 'content/images';

localFileStore = _.extend(baseStore, {
    // ### Save
    // Saves the image to storage (the file system)
    // - image is the express image object
    // - returns a promise which ultimately returns the full url to the uploaded image
    'save': function (image) {
        var saved = when.defer(),
            targetDir = this.getTargetDir(localDir);

        this.getUniqueFileName(this, image, targetDir).then(function (filename) {
            nodefn.call(fs.mkdirs, targetDir).then(function () {
                return nodefn.call(fs.copy, image.path, filename);
            }).then(function () {
                // we should remove the temporary image
                return nodefn.call(fs.unlink, image.path).otherwise(errors.logError);
            }).then(function () {
                // The src for the image must be in URI format, not a file system path, which in Windows uses \
                // For local file system storage can use relative path so add a slash
                var fullUrl = ('/' + filename).replace(new RegExp('\\' + path.sep, 'g'), '/');
                return saved.resolve(fullUrl);
            }).otherwise(function (e) {
                errors.logError(e);
                return saved.reject(e);
            });
        }).otherwise(errors.logError);

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
        return express['static'](path.join(__dirname, '/../../../', localDir));
    }
});

module.exports = localFileStore;
