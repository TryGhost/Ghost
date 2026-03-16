// This file is required before any test is run

// Taken from the should wiki, this is how to make should global
// Should is a global in our eslint test config
import should from 'should';
import sinon from 'sinon';

const shouldModule = should as unknown as {noConflict(): unknown; extend(): void};
Object.defineProperty(globalThis, 'should', {value: shouldModule.noConflict(), writable: true, configurable: true});
shouldModule.extend();

// Sinon is a simple case
// Sinon is a global in our eslint test config
Object.defineProperty(globalThis, 'sinon', {value: sinon, writable: true, configurable: true});
