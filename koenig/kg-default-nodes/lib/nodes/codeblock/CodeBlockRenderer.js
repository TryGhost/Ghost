export function renderCodeBlockNodeToDOM(node, options = {}) {
    /* c8 ignore start */
    if (!options.createDocument) {
        let document = typeof window !== 'undefined' && window.document;

        if (!document) {
            throw new Error('renderImageNodeToDOM() must be passed a `createDocument` function as an option when used in a non-browser environment'); // eslint-disable-line
        }

        options.createDocument = function () {
            return document;
        };
    }
    /* c8 ignore stop */

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