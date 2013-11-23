// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var configLoader = require('./core/config-loader.js'),
    errors       = require('./core/server/errorHandling');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

configLoader.loadConfig().then(function () {
    var ghost = require('./core/server');
    ghost();
}).otherwise(errors.logAndThrowError);