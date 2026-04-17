import clsx from 'clsx';
import {html} from '../tagged-template-fns.mjs';

/**
 * @param {Object} options
 * @param {string} [options.alignment]
 * @param {string} [options.color='accent']
 * @param {string} [options.text='']
 * @param {string} [options.textColor]
 * @param {string} [options.url='']
 * @returns {string}
 */
export function renderEmailButton({
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
                        <a href="${url}">${text}</a>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}