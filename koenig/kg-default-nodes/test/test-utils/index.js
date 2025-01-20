const {JSDOM} = require('jsdom');

/**
 * Test Utilities
 *
 * Shared utils for writing tests
 */

// Require overrides - these add globals for tests
require('./overrides');

// Require assertions - adds custom should assertions
require('./assertions');

const Prettier = require('@prettier/sync');

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

const dom = new JSDOM();
module.exports.dom = new JSDOM();

const parser = new dom.window.DOMParser();
module.exports.createDocument = function createDocument(html) {
    return parser.parseFromString(html, 'text/html');
};
