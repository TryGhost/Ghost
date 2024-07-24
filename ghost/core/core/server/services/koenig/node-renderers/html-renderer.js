import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';

export function renderHtmlNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.html;

    const segment = node.visibility.segment || '';

    const isEmailOnly = node.visibility.emailOnly;

    if (!html) {
        return renderEmptyContainer(document);
    }

    const textarea = document.createElement('textarea');
    textarea.value = `\n<!--kg-card-begin: html-->\n${html}\n<!--kg-card-end: html-->\n`;

    if (segment && isEmailOnly) {
        textarea.setAttribute('data-gh-segment', segment);
    }

    if (isEmailOnly && options.target !== 'email') {
        return renderEmptyContainer(document);
    }

    // `type: 'value'` will render the value of the textarea element
    // @see @tryghost/kg-lexical-html-renderer package
    return {element: textarea, type: 'value'};
}
