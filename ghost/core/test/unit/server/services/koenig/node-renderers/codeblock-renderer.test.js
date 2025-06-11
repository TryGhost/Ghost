const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/codeblock-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            code: '<script></script>',
            language: 'javascript',
            caption: 'A code block',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('codeblock', data, options);
    }

    function renderForEmail(data, options) {
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
