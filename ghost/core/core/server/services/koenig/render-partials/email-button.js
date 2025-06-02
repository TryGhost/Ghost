const clsx = require('clsx');
const {html} = require('../render-utils/tagged-template-fns.js');

/**
 * @param {Object} options
 * @param {string} [options.alignment]
 * @param {string} [options.color='accent']
 * @param {string} [options.text='']
 * @param {string} [options.textColor]
 * @param {string} [options.url='']
 * @param {string} [options.buttonWidth='']
 * @returns {string}
 */
function renderEmailButton({
    alignment = '',
    color = 'accent',
    text = '',
    url = '',
    buttonWidth = ''
} = {}) {
    const buttonClasses = clsx(
        'btn',
        color === 'accent' && 'btn-accent'
    );

    return html`
        <table class="${buttonClasses}" border="0" cellspacing="0" cellpadding="0"${alignment ? ` align="${alignment}"` : ''}>
            <tbody>
                <tr>
                    <td align="center"${buttonWidth ? ` width="${buttonWidth}"` : ''}>
                        <a href="${url}">${text}</a>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

module.exports = {
    renderEmailButton
};
