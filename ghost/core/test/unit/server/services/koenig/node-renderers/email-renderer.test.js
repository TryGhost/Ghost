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
    });
});
