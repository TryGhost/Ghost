const clsx = require('clsx');
const {html} = require('../render-utils/tagged-template-fns.js');
const stylex = require('../render-utils/stylex.js');

/**
 * @param {Object} options
 * @param {string} [options.url='']
 * @param {string} [options.text='']
 * @param {string} [options.alignment]
 * @param {string} [options.buttonWidth='']
 * @param {string} [options.color='accent']
 * @param {string} [options.textColor='']
 * @param {'fill'|'outline'} [options.style='fill']
 * @returns {string}
 */
function renderEmailButton({
    url = '',
    text = '',
    alignment = '',
    buttonWidth = '',
    color = 'accent',
    textColor = '',
    style = 'fill'
} = {}) {
    const isColoredFill = color !== 'accent' && style === 'fill';
    const isColoredOutline = color !== 'accent' && style === 'outline';

    const buttonClasses = clsx(
        'btn',
        color === 'accent' && 'btn-accent'
    );

    const buttonStyle = stylex(
        isColoredFill && {
            backgroundColor: color
        },
        isColoredOutline && {
            border: `1px solid ${color}`,
            backgroundColor: 'transparent',
            color: `${color} !important`
        }
    );

    const linkStyle = stylex(
        isColoredFill && textColor && {
            color: `${textColor} !important`
        },
        isColoredOutline && {
            color: `${color} !important`
        }
    );

    return html`
        <table class="${buttonClasses}" border="0" cellspacing="0" cellpadding="0"${alignment ? ` align="${alignment}"` : ''}>
            <tbody>
                <tr>
                    <td align="center"${buttonWidth ? ` width="${buttonWidth}"` : ''}${buttonStyle ? ` style="${buttonStyle}"` : ''}>
                        <a href="${url}"${linkStyle ? ` style="${linkStyle}"` : ''}>${text}</a>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

module.exports = {
    renderEmailButton
};
