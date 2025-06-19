const assert = require('assert/strict');
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

        it('can render without emoji', function () {
            const result = renderForWeb(getTestData({calloutEmoji: ''}));
            assert(!result.html.includes('kg-callout-emoji'));
        });

        it('reverts to white background when backgroundColor is invalid', function () {
            const result = renderForWeb(getTestData({backgroundColor: 'rgba(0, 0, 0, 0)'}));
            assert(result.html.includes('kg-callout-card-white'));
        });

        it('can render with inline code', function () {
            const result = renderForWeb(getTestData({calloutText: '<p><span style="white-space: pre-wrap;">Does </span><code spellcheck="false" style="white-space: pre-wrap;"><span>inline code</span></code><span style="white-space: pre-wrap;"> render properly?</span></p>'}));
            assert.equal(result.element.querySelector('.kg-callout-text').innerHTML.trim(), 'Does <code spellcheck="false" style="white-space: pre-wrap;">inline code</code> render properly?');
        });

        it('strips disallowed tags', function () {
            const result = renderForWeb(getTestData({calloutText: '<ul><li>Hello</li></ul>'}));
            assert.equal(result.element.querySelector('.kg-callout-text').innerHTML.trim(), 'Hello');
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

        it('can render without emoji', function () {
            const result = renderForWeb(getTestData({calloutEmoji: ''}));
            assert(!result.html.includes('kg-callout-emoji'));
        });

        it('reverts to white background when backgroundColor is invalid', function () {
            const result = renderForWeb(getTestData({backgroundColor: 'rgba(0, 0, 0, 0)'}));
            assert(result.html.includes('kg-callout-card-white'));
        });

        it('can render with inline code', function () {
            const result = renderForWeb(getTestData({calloutText: '<p><span style="white-space: pre-wrap;">Does </span><code spellcheck="false" style="white-space: pre-wrap;"><span>inline code</span></code><span style="white-space: pre-wrap;"> render properly?</span></p>'}));
            assert.equal(result.element.querySelector('.kg-callout-text').innerHTML.trim(), 'Does <code spellcheck="false" style="white-space: pre-wrap;">inline code</code> render properly?');
        });

        it('strips disallowed tags', function () {
            const result = renderForWeb(getTestData({calloutText: '<ul><li>Hello</li></ul>'}));
            assert.equal(result.element.querySelector('.kg-callout-text').innerHTML.trim(), 'Hello');
        });
    });
});
