import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/email-cta-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            alignment: 'left',
            buttonText: '',
            buttonUrl: '',
            html: '<p>Hello World</p>',
            segment: 'status:free',
            showButton: false,
            showDividers: true,
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('email-cta', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('email-cta', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('renders nothing', function () {
            const result = renderForWeb(getTestData());
            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div data-gh-segment="status:free">
                    <hr />
                    <p>Hello World</p>
                    <hr />
                </div>
            `);
        });

        it('renders nothing with missing html', function () {
            const result = renderForEmail(getTestData({html: ''}));
            assert.equal(result.html, '');
        });

        it('renders nothing with missing html even when button is enabled but has no text', function () {
            const result = renderForEmail(getTestData({html: '', showButton: true}));
            assert.equal(result.html, '');
        });

        it('does not render button if button text empty', function () {
            const result = renderForEmail(getTestData({showButton: true}));

            assertPrettifiesTo(result.html, html`
                <div data-gh-segment="status:free">
                    <hr />
                    <p>Hello World</p>
                    <hr />
                </div>
            `);
        });

        it('does not render button if button url empty', function () {
            const result = renderForEmail(getTestData({showButton: true, buttonText: 'Test'}));

            assertPrettifiesTo(result.html, html`
                <div data-gh-segment="status:free">
                    <hr />
                    <p>Hello World</p>
                    <hr />
                </div>
            `);
        });

        it('renders text with button and no dividers', function () {
            const result = renderForEmail(getTestData({showButton: true, buttonText: 'Test', buttonUrl: 'https://example.com', showDividers: false}));

            assertPrettifiesTo(result.html, html`
                <div data-gh-segment="status:free">
                    <p>Hello World</p>
                    <div class="btn btn-accent">
                        <table border="0" cellspacing="0" cellpadding="0" align="left">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <a href="https://example.com">Test</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p></p>
                </div>
            `);
        });

        it('renders only the button', function () {
            const result = renderForEmail(getTestData({html: '', showButton: true, buttonText: 'Test', buttonUrl: 'https://example.com', showDividers: false}));

            assertPrettifiesTo(result.html, html`
                <div data-gh-segment="status:free">
                    <div class="btn btn-accent">
                        <table border="0" cellspacing="0" cellpadding="0" align="left">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <a href="https://example.com">Test</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p></p>
                </div>
            `);
        });

        it('can align button center', function () {
            const result = renderForEmail(getTestData({alignment: 'center', showButton: true, buttonText: 'Test', buttonUrl: 'https://example.com'}));

            assertPrettifiesTo(result.html, html`
                <div data-gh-segment="status:free" class="align-center">
                    <hr />
                    <p>Hello World</p>
                    <div class="btn btn-accent">
                        <table border="0" cellspacing="0" cellpadding="0" align="center">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <a href="https://example.com">Test</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p></p>
                    <hr />
                </div>
            `);
        });

        it('can render button', function () {
            const result = renderForEmail(getTestData({showButton: true, buttonText: 'Click me', buttonUrl: 'https://ghost.org'}));
            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div data-gh-segment="status:free">
                    <hr />
                    <p>Hello World</p>
                    <div class="btn btn-accent">
                        <table border="0" cellspacing="0" cellpadding="0" align="left">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <a href="https://ghost.org">Click me</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p></p>
                    <hr />
                </div>
            `);
        });

        it('handles center alignment', function () {
            const result = renderForEmail(getTestData({alignment: 'center'}));

            assert.ok(result.html.includes('class="align-center"'));
        });
    });
});
