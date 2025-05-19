import {oneline} from '../../lib/utils/tagged-template-fns.mjs';

describe('Internal utils: oneline', function () {
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

        result.should.equal('<div class="btn btn-accent"><table border="0" cellspacing="0" cellpadding="0" align="center"><tr><td align="center"><a href="http://example.com">Click me</a></td></tr></table></div>');
    });

    it('works with plain strings', function () {
        const result = oneline(`
            <div class="test">
                <p>Hello world</p>
            </div>
        `);

        result.should.equal('<div class="test"><p>Hello world</p></div>');
    });
});
