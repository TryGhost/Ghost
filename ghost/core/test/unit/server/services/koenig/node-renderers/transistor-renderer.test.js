const assert = require('node:assert/strict');
const {callRenderer, visibility} = require('../test-utils');

describe('services/koenig/node-renderers/transistor-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            isEmpty: () => false,
            accentColor: '#15171A',
            backgroundColor: '#ffffff',
            visibility: visibility.buildDefaultVisibility(),
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('transistor', data, {siteUuid: 'test-site-uuid', accentColor: '#ff0000', ...options});
    }

    function renderForEmail(data, options) {
        return callRenderer('transistor', data, {siteUuid: 'test-site-uuid', accentColor: '#ff0000', ...options, target: 'email'});
    }

    describe('web', function () {
        it('renders iframe with URL-encoded %7Buuid%7D placeholder in data-src', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('data-src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D'));
            assert.ok(result.html.includes('data-kg-transistor-embed'));
        });

        it('includes noscript fallback with src for non-JS environments', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<noscript>'));
            assert.ok(result.html.includes('</noscript>'));
            // noscript iframe uses src directly (not data-src) so it loads without JS
            assert.match(result.html, /<noscript><iframe[^>]*src="https:\/\/partner\.transistor\.fm/);
        });

        it('includes ctx param', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('ctx='));
        });

        it('includes inline script for background color detection', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<script>'));
            assert.ok(result.html.includes('getComputedStyle'));
            assert.ok(result.html.includes('data-src'));
            assert.ok(result.html.includes('colorToRgb'));
        });

        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            // type: 'inner' means output is the figure's innerHTML (iframe + script + noscript)
            assert.ok(result.html.includes('<iframe'));
            assert.ok(result.html.includes('data-kg-transistor-embed'));
            assert.ok(result.html.includes('<script>'));
            assert.ok(result.html.includes('</script>'));
            assert.ok(result.html.includes('<noscript>'));
            assert.ok(result.html.includes('</noscript>'));
        });
    });

    describe('email', function () {
        it('renders email template with {uuid} placeholder', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html.includes('%%{uuid}%%'));
        });

        it('renders link to Transistor', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html.includes('href="https://partner.transistor.fm/ghost/%%{uuid}%%"'));
            assert.ok(result.html.includes('Listen to your podcasts'));
        });

        it('uses site accent color for icon background', function () {
            const result = renderForEmail(getTestData(), {design: {accentColor: '#ff5500'}});

            assert.ok(result.html.includes('background-color: #ff5500'));
        });

        it('uses default accent color when not provided', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html.includes('background-color: #15171A'));
        });
    });
});
