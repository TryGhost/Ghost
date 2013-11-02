// # Ghost bootloader
// Orchestrates the loading of Ghost

var core_path = process.env.APP_COVERAGE
    ? './core-cov'
    : './core',
    configLoader = require(core_path + '/config-loader.js'),
    error        = require(core_path + '/server/errorHandling');

// If no env is set, default to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

configLoader.loadConfig().then(function () {
    // The server and its dependencies require a populated config
    require(core_path + '/server');
}).otherwise(error.logAndThrowError);
