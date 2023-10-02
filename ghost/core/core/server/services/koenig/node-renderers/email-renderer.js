import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {removeSpaces, removeCodeWrappersFromHelpers, wrapReplacementStrings} from '../../utils/replacement-strings';
import {renderEmptyContainer} from '../../utils/render-empty-container';

export function renderEmailNode(node, options = {}) {
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