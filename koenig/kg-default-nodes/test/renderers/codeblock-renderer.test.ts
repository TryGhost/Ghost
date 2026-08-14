import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/codeblock-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            code: '<script></script>',
            language: 'javascript',
            caption: 'A code block',
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('codeblock', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('codeblock', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());
            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-code-card">
                    <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
                    <figcaption>A code block</figcaption>
                </figure>
            `);
        });

        it('renders without caption', function () {
            const result = renderForWeb(getTestData({caption: ''}));
            assertPrettifiesTo(result.html, html`
                <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
            `);
        });

        it('renders empty span when code is empty', function () {
            const result = renderForWeb(getTestData({code: '', language: '', caption: ''}));
            assert.equal(result.element.outerHTML, '<span></span>');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());
            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-code-card">
                    <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
                    <figcaption>A code block</figcaption>
                </figure>
            `);
        });

        it('renders without caption', function () {
            const result = renderForWeb(getTestData({caption: ''}));
            assertPrettifiesTo(result.html, html`
                <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
            `);
        });
    });
});
