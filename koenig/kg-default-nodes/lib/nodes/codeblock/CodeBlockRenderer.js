import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderCodeBlockNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.getCode() || node.getCode().trim() === '') {
        return document.createTextNode('');
    }

    const pre = document.createElement('pre');
    const code = document.createElement('code');

    if (node.getLanguage()) {
        code.setAttribute('class', `language-${node.getLanguage()}`);
    }

    code.appendChild(document.createTextNode(node.getCode()));
    pre.appendChild(code);

    if (node.getCaption()) {
        let figure = document.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-code-card');
        figure.appendChild(pre);

        let figcaption = document.createElement('figcaption');
        figcaption.appendChild(document.createTextNode(node.getCaption()));
        figure.appendChild(figcaption);

        return figure;
    } else {
        return pre;
    }
}
