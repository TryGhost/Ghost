// This file is required before any test is run

// Taken from the should wiki, this is how to make should global
// Should is a global in our eslint test config
// Vitest runs this as strict code, where assigning over should's read-only
// Object.prototype getter throws, so define the global instead
Object.defineProperty(global, 'should', {
  value: require('should').noConflict(),
  writable: true,
  configurable: true,
});
should.extend();

// Sinon is a simple case
// Sinon is a global in our eslint test config
global.sinon = require('sinon');
