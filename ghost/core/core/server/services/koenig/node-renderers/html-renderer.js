const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');
const {renderEmptyContainer} = require('../render-utils/render-empty-container');
const {renderWithVisibility} = require('../render-utils/visibility');
const {wrapReplacementStrings} = require('../render-utils/replacement-strings');

function renderHtmlNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.html;

    if (!html) {
        return renderEmptyContainer(document);
    }

    // Wrap replacement strings like {uniqueid} with %% for email processing
    // Only wrap if emailUniqueid labs flag is enabled
    let processedHtml = html;
    if (options.feature?.emailUniqueid) {
        processedHtml = wrapReplacementStrings(html);
    }
    const wrappedHtml = `\n<!--kg-card-begin: html-->\n${processedHtml}\n<!--kg-card-end: html-->\n`;

    const textarea = document.createElement('textarea');
    textarea.value = wrappedHtml;

    if (node.visibility) {
        const renderOutput = {element: textarea, type: 'value'};
        return renderWithVisibility(renderOutput, node.visibility, options);
    }

    // `type: 'value'` will render the value of the textarea element
    return {element: textarea, type: 'value'};
}

module.exports = renderHtmlNode;
