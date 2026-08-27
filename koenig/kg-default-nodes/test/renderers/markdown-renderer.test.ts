import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/markdown-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            markdown: '#HEADING\r\n- list\r\n- items',
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('markdown', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
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

        it('throws when createDocument is not callable', function () {
            assert.throws(() => {
                renderForWeb(getTestData(), {createDocument: true});
            }, {message: 'options.createDocument is not a function'});
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
