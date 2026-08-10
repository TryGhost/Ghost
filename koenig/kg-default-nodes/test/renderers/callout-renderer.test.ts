import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/callout-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            calloutText: '<p dir="ltr"><b><strong>Hello!</strong></b><span> Check </span><i><em class="italic">this</em></i> <a href="https://ghost.org" rel="noopener"><span>out</span></a><span>.</span></p>',
            calloutEmoji: '💡',
            backgroundColor: 'blue',
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('callout', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
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

        it('renders without emoji', function () {
            const result = renderForWeb(getTestData({calloutEmoji: ''}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-text">
                        <b><strong>Hello!</strong></b>
                        Check
                        <i><em class="italic">this</em></i>
                        <a href="https://ghost.org" rel="noopener">out</a>.
                    </div>
                </div>
            `);
        });

        it('falls back to white with an invalid backgroundColor', function () {
            const result = renderForWeb(getTestData({backgroundColor: 'rgba(124, 139, 154, 0.13)'}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-callout-card kg-callout-card-white">
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

        it('renders inline code', function () {
            const result = renderForWeb(getTestData({calloutText: '<p><span style="white-space: pre-wrap;">Does </span><code spellcheck="false" style="white-space: pre-wrap;"><span>inline code</span></code><span style="white-space: pre-wrap;"> render properly?</span></p>'}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-emoji">💡</div>
                    <div class="kg-callout-text">
                        Does <code spellcheck="false" style="white-space: pre-wrap">inline code</code> render properly?
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
