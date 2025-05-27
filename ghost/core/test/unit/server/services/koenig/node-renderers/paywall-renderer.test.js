const assert = require('assert/strict');
const {callRenderer} = require('../test-utils');

describe('services/koenig/node-renderers/paywall-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('paywall', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('paywall', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());
            assert.equal(result.html, '<!--members-only-->');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());
            assert.equal(result.html, '<!--members-only-->');
        });
    });
});
