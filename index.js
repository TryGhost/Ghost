// # Ghost bootloader
// Orchestrates the loading of Ghost

var configLoader = require('./core/config-loader.js'),
    error        = require('./core/server/errorHandling');

// Set CWD to current directory to allow ghost launching from anywhere
process.chdir(__dirname);

// If no env is set, default to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

configLoader.loadConfig().then(function () {
    // The server and its dependencies require a populated config
    require('./core/server');
}).otherwise(error.logAndThrowError);
