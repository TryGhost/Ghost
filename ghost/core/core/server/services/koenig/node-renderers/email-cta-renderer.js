import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {removeSpaces, wrapReplacementStrings} from '../../utils/replacement-strings';
import {escapeHtml} from '../../utils/escape-html';
import {renderEmptyContainer} from '../../utils/render-empty-container';

export function renderEmailCtaNode(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();
    const {html, buttonText, buttonUrl, showButton, alignment, segment, showDividers} = node;
    const hasButton = showButton && !!buttonText && !!buttonUrl;

    if ((!html && !hasButton) || options.target !== 'email') {
        return renderEmptyContainer(document);
    }

    const element = document.createElement('div');

    if (segment) {
        element.setAttribute('data-gh-segment', segment);
    }

    if (alignment === 'center') {
        element.setAttribute('class', 'align-center');
    }

    if (showDividers) {
        element.appendChild(document.createElement('hr'));
    }

    const cleanedHtml = wrapReplacementStrings(removeSpaces(html));
    element.innerHTML = element.innerHTML + cleanedHtml;

    if (hasButton) {
        const buttonTemplate = `
            <div class="btn btn-accent">
                <table border="0" cellspacing="0" cellpadding="0" align="${escapeHtml(alignment)}">
                    <tbody>
                        <tr>
                            <td align="center">
                                <a href="${escapeHtml(buttonUrl)}">${escapeHtml(buttonText)}</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const cleanedButton = wrapReplacementStrings(removeSpaces(buttonTemplate));
        element.innerHTML = element.innerHTML + cleanedButton;
    }

    if (showDividers) {
        element.appendChild(document.createElement('hr'));
    }

    return {element};
}