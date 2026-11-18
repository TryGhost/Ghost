import clsx from 'clsx';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {escapeHtml} from '../escape-html.js';
import {sanitizeColour} from '../sanitize-colour.js';
import {html} from '../tagged-template-fns.js';
import {stylex} from '../stylex.js';

export interface EmailButtonOptions {
    /** The URL the button links to, as stored; it's encoded for the attribute here */
    url?: string;
    /** The text displayed on the button, written as text rather than HTML */
    text?: string;
    /** The alignment of the button */
    alignment?: string;
    /** The width of the button */
    buttonWidth?: string;
    /** The color of the button, no color defaults to newsletter button color setting */
    color?: string;
    /** The style of the button */
    style?: 'fill' | 'outline';
}

const defaultOptions: Required<EmailButtonOptions> = {
    url: '',
    text: '',
    alignment: '',
    buttonWidth: '',
    color: '',
    style: 'fill'
};

function _getOptions(buttonOptions: EmailButtonOptions = {}): Required<EmailButtonOptions> {
    // merge with defaults
    // but we don't want undefined values to override default values
    return {
        ...defaultOptions,
        ...Object.fromEntries(
            Object.entries(buttonOptions).filter(([, value]) => value !== undefined)
        )
    };
}

export function renderEmailButton(buttonOptions: EmailButtonOptions = {}) {
    const options = _getOptions(buttonOptions);
    options.color = sanitizeColour(options.color);
    const {url, text} = options;
    const alignment = escapeHtml(options.alignment);
    const buttonWidth = escapeHtml(options.buttonWidth);

    const buttonClasses = _getButtonClasses(options);
    const buttonStyle = _getButtonStyle(options);
    const linkStyle = _getLinkStyle(options);

    return html`
        <table class="${buttonClasses}" border="0" cellspacing="0" cellpadding="0"${alignment ? ` align="${alignment}"` : ''}>
            <tbody>
                <tr>
                    <td align="center"${buttonWidth ? ` width="${buttonWidth}"` : ''}${buttonStyle ? ` style="${buttonStyle}"` : ''}>
                        <a href="${escapeHtml(url)}"${linkStyle ? ` style="${linkStyle}"` : ''}>${escapeHtml(text)}</a>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

function _isColoredFill({color, style}: EmailButtonOptions) {
    return Boolean(color) && color !== 'accent' && color !== 'transparent' && style === 'fill';
}

function _isColoredOutline({color, style}: EmailButtonOptions) {
    return Boolean(color) && color !== 'accent' && style === 'outline';
}

function _isValidHexColor(color: string) {
    return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(color);
}

function _getTextColor({color, style}: EmailButtonOptions) {
    if (_isColoredFill({color, style}) && _isValidHexColor(color!)) {
        return textColorForBackgroundColor(color!).hex();
    }

    return '';
}

function _getButtonClasses({color}: EmailButtonOptions) {
    return clsx(
        'btn',
        color === 'accent' && 'btn-accent'
    );
}

function _getButtonStyle({color, style}: EmailButtonOptions) {
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

function _getLinkStyle({color, style}: EmailButtonOptions) {
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
