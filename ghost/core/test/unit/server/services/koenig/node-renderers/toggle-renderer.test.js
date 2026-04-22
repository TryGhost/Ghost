const assert = require('node:assert/strict');
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
            const result = renderForEmail(getTestData(), {feature: {}});

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
