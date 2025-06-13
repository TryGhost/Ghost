const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/toggle-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            heading: 'Toggle Heading',
            content: 'Collapsible content',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('toggle', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('toggle', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                    <div class="kg-toggle-heading">
                        <h4 class="kg-toggle-heading-text">Toggle Heading</h4>
                        <button
                            class="kg-toggle-card-icon"
                            aria-label="Expand toggle to read content">
                            <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path
                                    class="cls-1"
                                    d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="kg-toggle-content">Collapsible content</div>
                </div>
            `);
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div
                    style="
                        background: transparent;
                        border: 1px solid rgba(124, 139, 154, 0.25);
                        border-radius: 4px;
                        padding: 20px;
                        margin-bottom: 1.5em;
                    "
                >
                    <h4
                        style="
                            font-size: 1.375rem;
                            font-weight: 600;
                            margin-bottom: 8px;
                            margin-top: 0px;
                        "
                    >
                        Toggle Heading
                    </h4>
                    <div style="font-size: 1rem; line-height: 1.5; margin-bottom: -1.5em">
                        Collapsible content
                    </div>
                </div>
            `);
        });
    });

    describe('email (emailCustomization)', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {emailCustomization: true}});

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <table cellspacing="0" cellpadding="0" border="0" width="100%" class="kg-toggle-card">
                    <tbody>
                        <tr>
                            <td class="kg-toggle-heading">
                                <h4>Toggle Heading</h4>
                            </td>
                        </tr>
                        <tr>
                            <td class="kg-toggle-content">Collapsible content</td>
                        </tr>
                    </tbody>
                </table>
            `);
        });
    });

    describe('email (emailCustomizationAlpha)', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {emailCustomizationAlpha: true}});

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <table cellspacing="0" cellpadding="0" border="0" width="100%" class="kg-toggle-card">
                    <tbody>
                        <tr>
                            <td class="kg-toggle-heading">
                                <h4>Toggle Heading</h4>
                            </td>
                        </tr>
                        <tr>
                            <td class="kg-toggle-content">Collapsible content</td>
                        </tr>
                    </tbody>
                </table>
            `);
        });
    });
});
