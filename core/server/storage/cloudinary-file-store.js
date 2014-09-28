// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var express    = require('express'),
    util       = require('util'),
    Promise    = require('bluebird'),
    cloudinary = require('cloudinary'),   
    errors     = require('../errors'),
    config     = require('../config'),
    utils      = require('../utils'),
    baseStore  = require('./base');

cloudinary.config({
    cloud_name: config.storage.credentials.cloud_name,
    api_key: config.storage.credentials.api_key,
    api_secret: config.storage.credentials.api_secret
});

function CloudinaryFileStore() {
}
util.inherits(CloudinaryFileStore, baseStore);

// ### Save
// Saves the image to cloudinary
// - image is the express image object
// - returns a promise which ultimately returns the full url to the uploaded image
CloudinaryFileStore.prototype.save = function (image) {
    return cloudinary.uploader.upload(image.path).then(function (result) {
        return result.url;
    })
    .catch(function (e) {
        errors.logError(e);
        return Promise.reject(e);
    });
};

CloudinaryFileStore.prototype.exists = function (filename) {
    return new Promise(function (resolve) {
        fs.exists(filename, function (exists) {
            resolve(exists);
        });
    });
};

// middleware for serving the files
CloudinaryFileStore.prototype.serve = function () {
    // For some reason send divides the max age number by 1000
    return express['static'](config.paths.imagesPath, {maxAge: utils.ONE_YEAR_MS});
};

module.exports = CloudinaryFileStore;
