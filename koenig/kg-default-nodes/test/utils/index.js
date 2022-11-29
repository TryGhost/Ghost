/**
 * Test Utilities
 *
 * Shared utils for writing tests
 */

// Require overrides - these add globals for tests
require('./overrides');

// Require assertions - adds custom should assertions
require('./assertions');

const Prettier = require('prettier');

module.exports.html = function html(partials, ...params) {
    let output = '';
    for (let i = 0; i < partials.length; i++) {
        output += partials[i];
        if (i < partials.length - 1) {
            output += params[i];
        }
    }

    return Prettier.format(output, {parser: 'html'});
};
