const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');
const {renderEmptyContainer} = require('../render-utils/render-empty-container');

function renderCodeBlockNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    if (!node.code || node.code.trim() === '') {
        return renderEmptyContainer(document);
    }

    const pre = document.createElement('pre');
    const code = document.createElement('code');

    if (node.language) {
        code.setAttribute('class', `language-${node.language}`);
    }

    code.appendChild(document.createTextNode(node.code));
    pre.appendChild(code);

    if (node.caption) {
        let figure = document.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-code-card');
        figure.appendChild(pre);

        let figcaption = document.createElement('figcaption');
        figcaption.innerHTML = node.caption;
        figure.appendChild(figcaption);

        return {element: figure};
    } else {
        return {element: pre};
    }
}

module.exports = renderCodeBlockNode;
