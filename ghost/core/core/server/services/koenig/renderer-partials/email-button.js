const clsx = require('clsx');
const {html} = require('../renderer-utils/tagged-template-fns');

/**
 * @param {Object} options
 * @param {string} [options.alignment]
 * @param {string} [options.color='accent']
 * @param {string} [options.text='']
 * @param {string} [options.textColor]
 * @param {string} [options.url='']
 * @returns {string}
 */
function renderEmailButton({
    alignment = '',
    color = 'accent',
    text = '',
    url = ''
} = {}) {
    const buttonClasses = clsx(
        'btn',
        color === 'accent' && 'btn-accent'
    );

    return html`
        <table class="${buttonClasses}" border="0" cellspacing="0" cellpadding="0" align="${alignment}">
            <tbody>
                <tr>
                    <td align="center">
                        <a href="${url}">${text} CUSTOM</a>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

module.exports = {
    renderEmailButton
};
