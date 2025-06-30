const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/email-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            html: '<p>Hello World</p>',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('email', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('email', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('renders nothing', function () {
            const result = renderForWeb(getTestData());

            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <p>Hello World</p>
            `);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForEmail(getTestData({html: ''}));
            assert.equal(result.html, '');
        });

        it('wraps {variable} in %%', function () {
            const result = renderForEmail(getTestData({html: '{variable}'}));
            assert.equal(result.html, '%%{variable}%%');
        });

        it('wraps {variable, "default"} in %%', function () {
            const result = renderForEmail(getTestData({html: '{variable, "default"}'}));
            assert.equal(result.html, '%%{variable, "default"}%%');
        });

        it('wraps {variable,  "default"} (extra spaces) in %%', function () {
            const result = renderForEmail(getTestData({html: '{variable,  "default"}'}));
            assert.equal(result.html, '%%{variable, "default"}%%');
        });

        it('wraps {variable "default"} (missing comma) in %%', function () {
            const result = renderForEmail(getTestData({html: '{variable "default"}'}));
            assert.equal(result.html, '%%{variable "default"}%%');
        });

        it('wraps {foo  "default"} in %% (extra space, missing comma)', function () {
            const result = renderForEmail(getTestData({html: '{foo  "default"}'}));
            assert.equal(result.html, '%%{foo "default"}%%');
        });

        it('does not wrap {invalid } in %% (invalid space at the end)', function () {
            const result = renderForEmail(getTestData({html: '{invalid }'}));
            assert.equal(result.html, '{invalid }');
        });

        it('does not wrap { invalid} in %% (invalid space at the beginning)', function () {
            const result = renderForEmail(getTestData({html: '{ invalid}'}));
            assert.equal(result.html, '{ invalid}');
        });

        it('does not wrap {foo invalid} in %% (two words, missing quotes)', function () {
            const result = renderForEmail(getTestData({html: '{foo invalid}'}));
            assert.equal(result.html, '{foo invalid}');
        });

        it('renders multiple paragraphs', function () {
            const result = renderForEmail(getTestData({html: '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>'}));
            assertPrettifiesTo(result.html, html`
                <p>First paragraph</p>
                <p>Second paragraph</p>
                <p>Third paragraph</p>
            `);
        });

        it('strips out <code> elements with placeholders', function () {
            const result = renderForEmail(getTestData({html: '<p>First paragraph</p><code>{placeholder}</code><p>Third paragraph</p>'}));
            assertPrettifiesTo(result.html, html`
                <p>First paragraph</p>
                %%{placeholder}%%
                <p>Third paragraph</p>
            `);
        });

        it('leaves <code> elements with no placeholders alone', function () {
            const result = renderForEmail(getTestData({html: '<p>First paragraph</p><code>Hello World</code><p>Third paragraph</p>'}));
            assertPrettifiesTo(result.html, html`
                <p>First paragraph</p>
                <code>Hello World</code>
                <p>Third paragraph</p>
            `);
        });
    });
});
