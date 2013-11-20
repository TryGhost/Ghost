// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var configLoader       = require('./core/server/config/loader'),
    errors             = require('./core/server/errorHandling');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

configLoader().then(function () {
    var ghost = require('./core/server');
    ghost();
}).otherwise(errors.logAndThrowError);