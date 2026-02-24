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
        it('renders iframe with URL-encoded %7Buuid%7D placeholder', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D'));
            assert.ok(result.html.includes('data-kg-transistor-embed'));
        });

        it('includes ctx param', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('ctx='));
        });

        it('includes inline script for background color detection', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<script>'));
            assert.ok(result.html.includes('getComputedStyle'));
            assert.ok(result.html.includes('background'));
        });

        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            // Verify structure: figure > iframe + script
            assert.ok(result.html.includes('<figure class="kg-card kg-transistor-card">'));
            assert.ok(result.html.includes('<iframe'));
            assert.ok(result.html.includes('data-kg-transistor-embed'));
            assert.ok(result.html.includes('<script>'));
            assert.ok(result.html.includes('</script>'));
            assert.ok(result.html.includes('</figure>'));
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
