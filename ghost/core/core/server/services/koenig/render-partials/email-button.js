const clsx = require('clsx');
const {textColorForBackgroundColor} = require('@tryghost/color-utils');
const {html} = require('../render-utils/tagged-template-fns.js');
const stylex = require('../render-utils/stylex.js');

/**
 * @typedef {Object} EmailButtonOptions
 * @property {string} [url=''] - The URL the button links to
 * @property {string} [text=''] - The text displayed on the button
 * @property {string} [alignment] - The alignment of the button
 * @property {string} [buttonWidth=''] - The width of the button
 * @property {string} [color=''] - The color of the button, no color defaults to newsletter button color setting
 * @property {'fill'|'outline'} [style='fill'] - The style of the button
 */

const defaultOptions = {
    url: '',
    text: '',
    alignment: '',
    buttonWidth: '',
    color: '',
    style: /** @type {'fill'|'outline'} */ ('fill')
};

/**
 * @param {EmailButtonOptions} buttonOptions
 * @returns {EmailButtonOptions}
 */
function _getOptions(buttonOptions = {}) {
    // merge with defaults
    // but we don't want undefined values to override default values
    return {
        ...defaultOptions,
        ...Object.fromEntries(
            Object.entries(buttonOptions).filter(([, value]) => value !== undefined)
        )
    };
}

/**
 * @param {EmailButtonOptions} buttonOptions
 * @returns {string}
 */
function renderEmailButton(buttonOptions = {}) {
    const options = _getOptions(buttonOptions);
    const {url, text, alignment, buttonWidth} = options;

    const buttonClasses = _getButtonClasses(options);
    const buttonStyle = _getButtonStyle(options);
    const linkStyle = _getLinkStyle(options);

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

/**
 * @param {EmailButtonOptions} options
 * @returns {boolean}
 */
function _isColoredFill({color, style}) {
    return color && color !== 'accent' && color !== 'transparent' && style === 'fill';
}

/**
 * @param {EmailButtonOptions} options
 * @returns {boolean}
 */
function _isColoredOutline({color, style}) {
    return color && color !== 'accent' && style === 'outline';
}

function _isValidHexColor(color) {
    return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(color);
}

/**
 * @param {EmailButtonOptions} options
 * @returns {string}
 */
function _getTextColor({color, style}) {
    if (_isColoredFill({color, style}) && _isValidHexColor(color)) {
        return textColorForBackgroundColor(color).hex();
    }

    return '';
}

/**
 * @param {EmailButtonOptions} options
 * @returns {string}
 */
function _getButtonClasses({color}) {
    return clsx(
        'btn',
        color === 'accent' && 'btn-accent'
    );
}

/**
 * @param {EmailButtonOptions} options
 * @returns {string}
 */
function _getButtonStyle({color, style}) {
    return stylex(
        _isColoredFill({color, style}) && {
            backgroundColor: color
        },
        _isColoredOutline({color, style}) && {
            color: `${color} !important`,
            border: `1px solid ${color}`,
            borderColor: 'currentColor', // match text color in dark mode inversions
            backgroundColor: 'transparent'
        }
    );
}

/**
 * @param {EmailButtonOptions} options
 * @returns {string}
 */
function _getLinkStyle({color, style}) {
    const textColor = _getTextColor({color, style});

    return stylex(
        _isColoredFill({color, style}) && textColor && {
            color: `${textColor} !important`
        },
        _isColoredOutline({color, style}) && {
            color: `${color} !important`
        }
    );
}

module.exports = {
    renderEmailButton,
    _getOptions,
    _isColoredFill,
    _isColoredOutline,
    _getTextColor,
    _getButtonClasses,
    _getButtonStyle,
    _getLinkStyle
};
