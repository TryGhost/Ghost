const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');
const {removeSpaces, removeCodeWrappersFromHelpers, wrapReplacementStrings} = require('../render-utils/replacement-strings');
const {renderEmptyContainer} = require('../render-utils/render-empty-container');

function renderEmailNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.html;

    if (!html || options.target !== 'email') {
        return renderEmptyContainer(document);
    }

    const cleanedHtml = wrapReplacementStrings(removeCodeWrappersFromHelpers(removeSpaces(html),document));

    const element = document.createElement('div');
    element.innerHTML = cleanedHtml;

    // `type: 'inner'` will render only the innerHTML of the element
    // @see @tryghost/kg-lexical-html-renderer package
    return {element, type: 'inner'};
}

module.exports = renderEmailNode;
