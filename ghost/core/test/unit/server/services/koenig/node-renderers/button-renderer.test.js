const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/button-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            buttonText: 'click me',
            buttonUrl: 'http://blog.com/post1',
            alignment: 'center',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('button', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('button', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-button-card kg-align-center">
                    <a href="http://blog.com/post1" class="kg-btn kg-btn-accent">click me</a>
                </div>
            `);
        });

        it('renders default button text with a missing buttonText', function () {
            const result = renderForWeb(getTestData({buttonText: ''}));
            assertPrettifiesTo(result.html, html`
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
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            assertPrettifiesTo(result.html, html`
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
        it('renders empty button with missing buttonText', function () {
            const result = renderForEmail(getTestData({buttonText: ''}));
            assertPrettifiesTo(result.html, html`
                <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td class="kg-card-spacing">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <a href="http://blog.com/post1"></a>
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
    });
});
