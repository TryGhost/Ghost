import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';

export function renderHtmlNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.html;

    if (!html) {
        return renderEmptyContainer(document);
    }

    const textarea = document.createElement('textarea');
    textarea.innerHTML = `\n<!--kg-card-begin: html-->\n${html}\n<!--kg-card-end: html-->\n`;

    // `type: 'value'` will render the value of the textarea element
    // @see @tryghost/kg-lexical-html-renderer package
    return {element: textarea, type: 'value'};
}
