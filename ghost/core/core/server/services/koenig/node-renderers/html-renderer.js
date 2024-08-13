import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';

export function renderHtmlNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.html;

    const segment = node.visibility.segment || '';

    const showOnEmail = node.visibility.showOnEmail;
    const showOnWeb = node.visibility.showOnWeb;

    if (!html) {
        return renderEmptyContainer(document);
    }

    const textarea = document.createElement('textarea');
    textarea.value = `\n<!--kg-card-begin: html-->\n${html}\n<!--kg-card-end: html-->\n`;

    if (segment) {
        textarea.setAttribute('data-gh-segment', segment);
    }

    const isEmailOnly = !showOnWeb && showOnEmail;
    const isWebOnly = showOnWeb && !showOnEmail;
    const showOnWebAndEmail = showOnEmail && showOnWeb;
    const showNowhere = !showOnEmail && !showOnWeb;

    if (showNowhere) {
        return renderEmptyContainer(document);
    }

    if (isWebOnly && options.target !== 'email') {
        return {element: textarea, type: 'value'};
    }

    if (isWebOnly && options.target === 'email') {
        return renderEmptyContainer(document);
    }

    if (isEmailOnly && options.target !== 'email') {
        return renderEmptyContainer(document);
    }

    if (isEmailOnly && options.target === 'email') {
        const container = document.createElement('div');
        container.innerHTML = `\n<!--kg-card-begin: html-->\n${html}\n<!--kg-card-end: html-->\n`;
        if (segment) {
            container.setAttribute('data-gh-segment', segment);
        }
        return {element: container, type: 'html'};
    }

    if (isWebOnly && options.target === 'email') {
        return renderEmptyContainer(document);
    }

    if (showOnWebAndEmail) {
        if (options.target === 'email') {
            const container = document.createElement('div');
            container.innerHTML = `\n<!--kg-card-begin: html-->\n${html}\n<!--kg-card-end: html-->\n`;
            if (segment) {
                container.setAttribute('data-gh-segment', segment);
            }
            return {element: container, type: 'html'};
        }

        return {element: textarea, type: 'value'};
    }

    // `type: 'value'` will render the value of the textarea element
    // return {element: textarea, type: 'value'};
}
