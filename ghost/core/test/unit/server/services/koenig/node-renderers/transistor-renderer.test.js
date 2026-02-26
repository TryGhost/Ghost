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
        it('renders static placeholder card', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('kg-transistor-placeholder'));
            assert.ok(result.html.includes('kg-transistor-icon'));
            assert.ok(result.html.includes('kg-transistor-content'));
        });

        it('renders placeholder title and description', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('Members-only podcasts'));
            assert.ok(result.html.includes('Your Transistor podcasts will appear here.'));
        });

        it('does not render iframe embed markup', function () {
            const result = renderForWeb(getTestData());

            assert.ok(!result.html.includes('<iframe'));
            assert.ok(!result.html.includes('data-kg-transistor-embed'));
        });

        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('kg-transistor-placeholder'));
            assert.ok(result.html.includes('kg-transistor-title'));
            assert.ok(result.html.includes('kg-transistor-description'));
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
