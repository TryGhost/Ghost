// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var _         = require('lodash'),
    express   = require('express'),
    fs        = require('fs-extra'),
    nodefn    = require('when/node'),
    path      = require('path'),
    when      = require('when'),
    errors    = require('../errors'),
    config    = require('../config'),
    utils     = require('../utils'),
    baseStore = require('./base'),
    images    = require('images'),

    localFileStore;

localFileStore = _.extend(baseStore, {
    // ### Save
    // Saves the image to storage (the file system)
    // - image is the express image object
    // - returns a promise which ultimately returns the full url to the uploaded image
    'save': function (image) {
        var saved = when.defer(),
            targetDir = this.getTargetDir(config.paths.imagesPath),
            targetFilename,
            uploadPath,
            uploadFilename,
            targetThumb,
            targetUploadThumb,
            hasThumb = false;

        this.getUniqueFileName(this, image, targetDir).then(function (filename) {
            targetFilename = filename;
            uploadPath = config.cdn.syncImagesPath + targetDir.substr(targetDir.lastIndexOf('images') + 7);

            return nodefn.call(fs.mkdirs, targetDir);
        }).then(function () {
            uploadFilename = uploadPath + '/' + targetFilename.substr(targetFilename.lastIndexOf('/') + 1);

            return nodefn.call(fs.copy, image.path, targetFilename);
        }).then(function () {
            var thumbDir,
                pos,
                thumbName;
            var uploadThumbDir;

            thumbDir = targetDir + '/215x213/';
            uploadThumbDir = uploadPath + '/215x213/';
            pos = targetFilename.lastIndexOf('/') + 1;
            thumbName = targetFilename.substr(pos);

            if (-1 == pos) {
                return ;
            }
            targetThumb = thumbDir + thumbName;
            targetUploadThumb = uploadThumbDir + thumbName;

            var done = when.defer();
            fs.exists(thumbDir, function(exists) {
                if (!exists) {
                    // 创建目录
                    fs.mkdir(thumbDir, function(err) {
                        if (err) {
                            done.reject();
                            return ;
                        }

                        done.resolve(targetThumb);
                    });
                }

                done.resolve(targetThumb);
            });

            return done.promise;
        }).then(function(targetThumb) {
            var img = images(targetFilename);

            // img.size(img.width() * 180 / img.height(), 180);
            // if (img.width() < 300) {
            //     return ;
            // }
            // if (img.height() < 180) {
            //     return ;
            // }

            hasThumb = true;
            var x = (img.width() - 300) / 2;
            var y = (img.height() - 215) / 2;
            return images(img, x, y, 300, 180).save(targetThumb);
        }).then(function() {
            // 创建cdn上得目录
            if (config.cdn.isProduction) {
                return nodefn.call(fs.mkdirs, uploadPath);
            }
        }).then(function() {

            var cpFile = function(src, dest) {
                var deferred = when.defer();
                fs.copy(src, dest, function(err){
                    if (err) {
                        deferred.reject(err);
                    }

                    deferred.resolve();
                });

                return deferred.promise;
            }

            // copy文件到cdn上
            if (config.cdn.isProduction) {
                if (hasThumb) {
                    return when.all([cpFile(targetFilename, uploadFilename),
                              cpFile(targetThumb, targetUploadThumb)]);
                }

                return cpFile(targetFilename, uploadFilename);
            }
        }).then(function() {
            // The src for the image must be in URI format, not a file system path, which in Windows uses \
            // For local file system storage can use relative path so add a slash
            var fullUrl = (config.paths.subdir + '/' + config.paths.imagesRelPath + '/' + path.relative(config.paths.imagesPath, targetFilename)).replace(new RegExp('\\' + path.sep, 'g'), '/');

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
        // For some reason send divides the max age number by 1000
        return express['static'](config.paths.imagesPath, {maxAge: utils.ONE_YEAR_MS});
    }
});

module.exports = localFileStore;
