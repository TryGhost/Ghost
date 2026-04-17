import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';
import {renderWithVisibility} from '../../utils/visibility';

export function renderHtmlNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.html;

    if (!html) {
        return renderEmptyContainer(document);
    }

    const wrappedHtml = `\n<!--kg-card-begin: html-->\n${html}\n<!--kg-card-end: html-->\n`;

    const textarea = document.createElement('textarea');
    textarea.value = wrappedHtml;

    if (node.visibility) {
        const renderOutput = {element: textarea, type: 'value'};
        return renderWithVisibility(renderOutput, node.visibility, options);
    }

    // `type: 'value'` will render the value of the textarea element
    return {element: textarea, type: 'value'};
}
