const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/markdown-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            markdown: '#HEADING\r\n- list\r\n- items',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('markdown', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('markdown', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <h1 id="heading">HEADING</h1>
                <ul>
                    <li>list</li>
                    <li>items</li>
                </ul>
            `);
        });

        it('renders nothing with a missing markdown', function () {
            const result = renderForWeb(getTestData({markdown: ''}));
            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <h1 id="heading">HEADING</h1>
                <ul>
                    <li>list</li>
                    <li>items</li>
                </ul>
            `);
        });

        it('renders nothing with a missing markdown', function () {
            const result = renderForEmail(getTestData({markdown: ''}));
            assert.equal(result.html, '');
        });
    });
});
