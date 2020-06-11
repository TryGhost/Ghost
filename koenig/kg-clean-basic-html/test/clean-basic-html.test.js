// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const {JSDOM} = require('jsdom');
const cleanBasicHtml = require('../');

describe('cleanBasicHtml', function () {
    let options = {};

    before(function () {
        options = {
            createDocument(html) {
                return (new JSDOM(html)).window.document;
            }
        };
    });

    it('errors in Node.js env without a `createDocument` option', function () {
        should(function () {
            cleanBasicHtml('Test');
        }).throw('cleanBasicHtml() must be passed a `createDocument` function as an option when used in a non-browser environment');
    });

    it('trims all variants of whitespace', function () {
        const html = '  <br>&nbsp;&nbsp; &nbsp;';
        const result = cleanBasicHtml(html, options);

        result.should.equal('');
    });

    it('keeps whitespace between text', function () {
        const html = '&nbsp; <br>Testing &nbsp;Significant Whitespace<br />&nbsp;';
        const result = cleanBasicHtml(html, options);

        result.should.equal('Testing Significant Whitespace');
    });

    it('removes DOM elements with blank text content', function () {
        const html = '&nbsp; <p> &nbsp;&nbsp;<br></p>';
        const result = cleanBasicHtml(html, options);

        result.should.equal('');
    });

    it('keeps elements with text content', function () {
        const html = ' &nbsp;<strong> Test&nbsp;</strong> ';
        const result = cleanBasicHtml(html, options);

        result.should.equal('<strong> Test&nbsp;</strong>');
    });
});
