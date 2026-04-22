const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/horizontalrule-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('horizontalrule', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('horizontalrule', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <hr />
            `);
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <table class="kg-card kg-hr-card" role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td>
                                <!--[if !mso]><!-- -->
                                <hr style="display: none;" />
                                <!--<![endif]-->
                                <table class="kg-hr" role="presentation" border="0" cellpadding="0" cellspacing="0">
                                    <tbody>
                                        <tr>
                                            <td>&nbsp;</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });
    });
});
