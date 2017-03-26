// This file is required before any test is run

// Expose serverRequire as a function for requiring things from the server
global.serverRequire = function serverRequire(name) {
    return require.main.require('core/server/' + name);
};

// Taken from the should wiki, this is how to make should global
global.should = require('should').noConflict();
should.extend();

// Sinon is a simple case
global.sinon = require('sinon');
