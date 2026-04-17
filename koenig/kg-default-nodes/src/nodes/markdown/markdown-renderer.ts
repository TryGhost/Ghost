import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';
import {render} from '@tryghost/kg-markdown-html-renderer';

interface MarkdownNodeData {
    markdown: string;
}

interface MarkdownRenderOptions extends ExportDOMOptions {}

export function renderMarkdownNode(node: MarkdownNodeData, options: MarkdownRenderOptions = {}): ExportDOMOutput<HTMLDivElement, 'inner'> {
    addCreateDocumentOption(options);
    if (typeof options.createDocument !== 'function') {
        throw new TypeError('renderMarkdownNode requires options.createDocument to be a function');
    }

    const document = options.createDocument();

    const html = render(node.markdown || '', options as Record<string, unknown>);

    const element = document.createElement('div');
    element.innerHTML = html;

    // `type: 'inner'` will render only the innerHTML of the element
    // @see @tryghost/kg-lexical-html-renderer package
    return {element, type: 'inner' as const};
}
