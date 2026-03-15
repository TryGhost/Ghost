const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/callout-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            calloutText: '<p dir="ltr"><b><strong>Hello!</strong></b><span> Check </span><i><em class="italic">this</em></i> <a href="https://ghost.org" rel="noopener"><span>out</span></a><span>.</span></p>',
            calloutEmoji: '💡',
            backgroundColor: 'blue',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('callout', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('callout', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-emoji">💡</div>
                    <div class="kg-callout-text">
                        <b><strong>Hello!</strong></b>
                        Check
                        <i><em class="italic">this</em></i>
                        <a href="https://ghost.org" rel="noopener">out</a>.
                    </div>
                </div>
            `);
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-emoji">💡</div>
                    <div class="kg-callout-text">
                        <b><strong>Hello!</strong></b>
                        Check
                        <i><em class="italic">this</em></i>
                        <a href="https://ghost.org" rel="noopener">out</a>.
                    </div>
                </div>
            `);
        });
    });
});
