import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, createDocument, html} from '../test-utils/index.js';

describe('renderers/button-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            buttonText: 'click me',
            buttonUrl: 'http://blog.com/post1',
            alignment: 'center',
            ...overrides
        };
    }

    // Values containing characters that are special in HTML
    const badText = 'Go <b>now</b> & "save"';
    const badUrl = 'https://example.org/a"b>c?x=1&y=<2>';

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('button', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('button', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-button-card kg-align-center">
                    <a href="http://blog.com/post1" class="kg-btn kg-btn-accent">click me</a>
                </div>
            `);
        });

        it('renders default button text with a missing buttonText', async function () {
            const result = renderForWeb(getTestData({buttonText: ''}));
            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-button-card kg-align-center">
                    <a href="http://blog.com/post1" class="kg-btn kg-btn-accent">Button Title</a>
                </div>
            `);
        });

        it('renders nothing with a missing buttonUrl', function () {
            const result = renderForWeb(getTestData({buttonUrl: ''}));
            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            await assertPrettifiesTo(result.html, html`
                <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td class="kg-card-spacing">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <a href="http://blog.com/post1">click me</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        // TODO: This is a bug in the email renderer, it should render the default button text
        it('renders default button text with a missing buttonText', async function () {
            const result = renderForEmail(getTestData({buttonText: ''}));
            await assertPrettifiesTo(result.html, html`
                <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td class="kg-card-spacing">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <a href="http://blog.com/post1">Button Title</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('renders nothing with a missing buttonUrl', function () {
            const result = renderForEmail(getTestData({buttonUrl: ''}));
            assert.equal(result.html, '');
        });

        it('renders a button URL and text containing special characters', function () {
            const result = renderForEmail(getTestData({buttonUrl: badUrl, buttonText: badText}));
            const link = createDocument(result.html).querySelector('table.btn a');

            assert.equal(link?.getAttribute('href'), badUrl);
            assert.equal(link?.textContent, badText);
            assert.equal(link?.children.length, 0);
        });

        it('renders an alignment containing special characters', function () {
            const badAlignment = 'center" x="<y>';
            const result = renderForEmail(getTestData({alignment: badAlignment}));
            const table = createDocument(result.html).querySelector('table.btn');

            assert.deepEqual(table?.getAttributeNames(), ['class', 'border', 'cellspacing', 'cellpadding', 'align']);
            assert.equal(table?.getAttribute('align'), badAlignment);
        });
    });
});
