import assert from 'node:assert/strict';
import {callRenderer} from '../test-utils/index.js';

describe('renderers/paywall-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('paywall', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
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
