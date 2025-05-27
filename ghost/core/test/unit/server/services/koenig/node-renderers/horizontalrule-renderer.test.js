const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/horizontalrule-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('horizontalrule', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('horizontalrule', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <hr />
            `);
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <hr />
            `);
        });
    });
});
