const assert = require('node:assert/strict');
const {callRenderer} = require('../test-utils');

describe('services/koenig/node-renderers/html-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('html', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('html', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            // TODO: fix this, needs exact match because comments get lost in assertPrettifiesTo
            assert.equal(result.html, `
<!--kg-card-begin: html-->
<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>
<!--kg-card-end: html-->
`);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForWeb(getTestData({html: ''}));
            assert.equal(result.html, '');
        });

        // TODO: add tests for visibility
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            // TODO: fix this, needs exact match because comments get lost in assertPrettifiesTo
            assert.equal(result.html, `
<!--kg-card-begin: html-->
<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>
<!--kg-card-end: html-->
`);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForEmail(getTestData({html: ''}));
            assert.equal(result.html, '');
        });

        it('wraps uniqueid replacement strings when emailUniqueid feature is enabled', function () {
            const htmlWithUniqueId = '<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">';
            const result = renderForEmail(getTestData({html: htmlWithUniqueId}), {
                feature: {emailUniqueid: true}
            });

            assert.ok(result.html.includes('%%{uniqueid}%%'));
            assert.ok(!result.html.includes('>{uniqueid}<')); // Should not have unwrapped version
            assert.ok(result.html.includes('kg-card-begin: html'));
        });

        it('does not wrap uniqueid replacement strings when emailUniqueid feature is disabled', function () {
            const htmlWithUniqueId = '<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">';
            const result = renderForEmail(getTestData({html: htmlWithUniqueId}), {
                feature: {emailUniqueid: false}
            });

            assert.ok(!result.html.includes('%%{uniqueid}%%'));
            assert.ok(result.html.includes('{uniqueid}'));
            assert.ok(result.html.includes('kg-card-begin: html'));
        });

        it('does not wrap uniqueid replacement strings when feature object is missing', function () {
            const htmlWithUniqueId = '<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">';
            const result = renderForEmail(getTestData({html: htmlWithUniqueId}));

            assert.ok(!result.html.includes('%%{uniqueid}%%'));
            assert.ok(result.html.includes('{uniqueid}'));
            assert.ok(result.html.includes('kg-card-begin: html'));
        });

        it('wraps multiple replacement strings when emailUniqueid feature is enabled', function () {
            const htmlWithMultiple = '<img src="https://ads.example.com/banner.jpg?id={uniqueid}&name={first_name}" alt="Ad">';
            const result = renderForEmail(getTestData({html: htmlWithMultiple}), {
                feature: {emailUniqueid: true}
            });

            assert.ok(result.html.includes('%%{uniqueid}%%'));
            assert.ok(result.html.includes('%%{first_name}%%'));
            assert.ok(!result.html.includes('>{uniqueid}<'));
            assert.ok(!result.html.includes('>{first_name}<'));
        });
    });
});
