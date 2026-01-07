const assert = require('assert/strict');
const {oneline} = require('../../../../../../core/server/services/koenig/render-utils/tagged-template-fns');

describe('services/koenig/render-utils/tagged-template-fns', function () {
    describe('oneline', function () {
        it('removes indentation and normalizes whitespace', function () {
            const buttonUrl = 'http://example.com';
            const buttonText = 'Click me';
            const alignment = 'center';

            const result = oneline`
                <div class="btn btn-accent">
                    <table border="0" cellspacing="0" cellpadding="0" align="${alignment}">
                        <tr>
                            <td align="center">
                                <a href="${buttonUrl}">${buttonText}</a>
                            </td>
                        </tr>
                    </table>
                </div>
            `;

            assert.equal(result, '<div class="btn btn-accent"><table border="0" cellspacing="0" cellpadding="0" align="center"><tr><td align="center"><a href="http://example.com">Click me</a></td></tr></table></div>');
        });

        it('works with plain strings', function () {
            const result = oneline(`
                <div class="test">
                    <p>Hello world</p>
                </div>
            `);

            assert.equal(result, '<div class="test"><p>Hello world</p></div>');
        });

        it('handles attributes on new lines', function () {
            const result = oneline`
                <div
                    class="test classes"
                    data-test="testing"
                    style="color: red;"
                >
                </div>
            `;

            assert.equal(result, '<div class="test classes" data-test="testing" style="color: red;"></div>');
        });
    });
});
