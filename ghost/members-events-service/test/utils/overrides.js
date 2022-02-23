// This file is required before any test is run

// Taken from the should wiki, this is how to make should global
// Should is a global in our eslint test config
global.should = require('should').noConflict();
should.extend();

// Sinon is a simple case
// Sinon is a global in our eslint test config
global.sinon = require('sinon');
