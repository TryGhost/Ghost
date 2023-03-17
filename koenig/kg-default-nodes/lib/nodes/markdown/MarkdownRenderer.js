import markdownHtmlRenderer from '@tryghost/kg-markdown-html-renderer';
import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderMarkdownNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    const html = markdownHtmlRenderer.render(node.getMarkdown() || '', options);

    const div = document.createElement('div');

    div.innerHTML = html;

    return div;
}
