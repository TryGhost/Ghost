const assert = require('assert/strict');
const {callRenderer} = require('../test-utils');

describe('services/koenig/node-renderers/html-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('html', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('html', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            // TODO: fix this, needs exact match because comments get lost in assertPrettifiesTo
            assert.equal(result.html, `
<!--kg-card-begin: html-->
<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>
<!--kg-card-end: html-->
`);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForWeb(getTestData({html: ''}));
            assert.equal(result.html, '');
        });

        // TODO: add tests for visibility
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            // TODO: fix this, needs exact match because comments get lost in assertPrettifiesTo
            assert.equal(result.html, `
<!--kg-card-begin: html-->
<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>
<!--kg-card-end: html-->
`);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForEmail(getTestData({html: ''}));
            assert.equal(result.html, '');
        });
    });
});
