import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';

interface CodeBlockNodeData {
    code: string;
    language: string;
    caption: string;
}

interface RenderOptions extends ExportDOMOptions {}

export function renderCodeBlockNode(node: CodeBlockNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

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
        const figure = document.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-code-card');
        figure.appendChild(pre);

        const figcaption = document.createElement('figcaption');
        figcaption.innerHTML = node.caption;
        figure.appendChild(figcaption);

        return {element: figure, type: 'outer' as const};
    } else {
        return {element: pre, type: 'outer' as const};
    }
}
