const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/email-cta-renderer', function () {
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

    function renderForWeb(data, options) {
        return callRenderer('email-cta', data, options);
    }

    function renderForEmail(data, options) {
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
