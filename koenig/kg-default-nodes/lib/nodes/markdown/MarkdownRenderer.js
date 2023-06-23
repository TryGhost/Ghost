import markdownHtmlRenderer from '@tryghost/kg-markdown-html-renderer';
import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderMarkdownNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = markdownHtmlRenderer.render(node.markdown || '', options);

    const element = document.createElement('div');
    element.innerHTML = html;

    // `type: 'inner'` will render only the innerHTML of the element
    // @see @tryghost/kg-lexical-html-renderer package
    return {element, type: 'inner'};
}
