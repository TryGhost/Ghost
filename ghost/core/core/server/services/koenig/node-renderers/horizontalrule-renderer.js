const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');

function renderHorizontalRuleNode(_, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const element = document.createElement('hr');
    return {element};
}

module.exports = renderHorizontalRuleNode;
