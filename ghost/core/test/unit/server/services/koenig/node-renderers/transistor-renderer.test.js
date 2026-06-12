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
        it('renders iframe embed with data-src', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<iframe'));
            assert.ok(result.html.includes('data-src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D?ctx=test-site-uuid"'));
            assert.ok(result.html.includes('data-kg-transistor-embed'));
        });

        it('renders noscript fallback iframe', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<noscript>'));
            assert.ok(result.html.includes('src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D?ctx=test-site-uuid"'));
        });

        it('renders embed script with background detection and resize listener', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<script>'));
            assert.ok(result.html.includes('initTransistorEmbed'));
            assert.ok(result.html.includes('colorToRgb'));
            assert.ok(result.html.includes('event.data.type === \'resize\''));
            assert.ok(result.html.includes('partner.transistor.fm'));
            assert.ok(result.html.includes('Number.isSafeInteger'));
        });

        it('includes siteUuid as ctx param', function () {
            const result = renderForWeb(getTestData(), {siteUuid: 'my-site-uuid'});

            assert.ok(result.html.includes('ctx=my-site-uuid'));
        });

        it('renders without ctx param when siteUuid is not provided', function () {
            const result = callRenderer('transistor', getTestData(), {});

            assert.ok(result.html.includes('data-src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"'));
            assert.ok(!result.html.includes('ctx='));
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
