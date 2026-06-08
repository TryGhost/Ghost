const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');

function renderPaywallNode(_, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();
    const element = document.createElement('div');

    element.innerHTML = '<!--members-only-->';

    // `type: 'inner'` will render only the innerHTML of the element
    // @see @tryghost/kg-lexical-html-renderer package
    return {element, type: 'inner'};
}

module.exports = renderPaywallNode;
