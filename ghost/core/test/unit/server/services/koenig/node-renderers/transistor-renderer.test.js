const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo, visibility} = require('../test-utils');

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
        return callRenderer('transistor', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('transistor', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('renders iframe with URL-encoded %7Buuid%7D placeholder', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D'));
            assert.ok(result.html.includes('data-kg-transistor-embed'));
        });

        it('includes accent color as query param', function () {
            const result = renderForWeb(getTestData({accentColor: '#ff0000'}));

            assert.ok(result.html.includes('color=ff0000'));
        });

        it('includes background color as query param', function () {
            const result = renderForWeb(getTestData({backgroundColor: '#000000'}));

            assert.ok(result.html.includes('background=000000'));
        });

        it('includes both color params when both are set', function () {
            const result = renderForWeb(getTestData({
                accentColor: '#ff0000',
                backgroundColor: '#000000'
            }));

            assert.ok(result.html.includes('color=ff0000'));
            assert.ok(result.html.includes('background=000000'));
        });

        it('renders without color params when colors are not set', function () {
            const result = renderForWeb(getTestData({
                accentColor: null,
                backgroundColor: null
            }));

            assert.ok(result.html.includes('src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"'));
            assert.ok(!result.html.includes('color='));
            assert.ok(!result.html.includes('background='));
        });

        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-transistor-card">
                    <iframe
                        width="100%"
                        height="325"
                        title="Transistor podcasts"
                        frameborder="no"
                        scrolling="no"
                        seamless=""
                        src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D?color=15171A&amp;background=ffffff"
                        data-kg-transistor-embed=""
                    ></iframe>
                </figure>
            `);
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
