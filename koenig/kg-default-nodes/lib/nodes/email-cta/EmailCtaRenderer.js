import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {removeSpaces, wrapReplacementStrings} from '../../utils/replacement-strings';
import {escapeHtml} from '../../utils/escape-html';

export function renderEmailCtaNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.getHtml();
    const buttonText = node.getButtonText();
    const buttonUrl = node.getButtonUrl();
    const showButton = node.getShowButton();
    const alignment = node.getAlignment();
    const segment = node.getSegment();
    const showDividers = node.getShowDividers();

    const hasButton = showButton && !!buttonText && !!buttonUrl;

    if ((!html && !hasButton) || options.target !== 'email') {
        return document.createTextNode('');
    }

    const container = document.createElement('div');

    if (segment) {
        container.setAttribute('data-gh-segment', segment);
    }

    if (alignment === 'center') {
        container.setAttribute('class', 'align-center');
    }

    if (showDividers) {
        container.appendChild(document.createElement('hr'));
    }

    const cleanedHtml = wrapReplacementStrings(removeSpaces(html));

    container.innerHTML = container.innerHTML + cleanedHtml;

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
        container.innerHTML = container.innerHTML + cleanedButton;
    }

    if (showDividers) {
        container.appendChild(document.createElement('hr'));
    }

    return container;
}