// This file is required before any test is run

// Taken from the should wiki, this is how to make should global
// Should is a global in our eslint test config
import should from 'should';
import sinon from 'sinon';

Object.defineProperty(globalThis, 'should', {value: (should as unknown as {noConflict(): typeof should}).noConflict(), writable: true, configurable: true});
(should as unknown as {extend(): void}).extend();

// Sinon is a simple case
// Sinon is a global in our eslint test config
Object.defineProperty(globalThis, 'sinon', {value: sinon, writable: true, configurable: true});
