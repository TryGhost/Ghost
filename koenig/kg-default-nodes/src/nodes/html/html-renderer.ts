import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';
import {renderWithVisibility} from '../../utils/visibility.js';

interface HtmlNodeData {
    html: string;
    visibility?: Record<string, unknown>;
}

interface RenderOptions extends ExportDOMOptions {}

export type HtmlExportDOMOutput =
    ExportDOMOutput<Element, 'inner' | 'value' | 'html'>;

export function renderHtmlNode(node: HtmlNodeData, options: RenderOptions = {}): HtmlExportDOMOutput {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const html = node.html;

    if (!html) {
        return renderEmptyContainer(document);
    }

    const wrappedHtml = `\n<!--kg-card-begin: html-->\n${html}\n<!--kg-card-end: html-->\n`;

    const textarea = document.createElement('textarea');
    textarea.value = wrappedHtml;

    if (node.visibility) {
        const renderOutput: ExportDOMOutput<HTMLTextAreaElement, 'value'> = {element: textarea, type: 'value'};
        return renderWithVisibility(renderOutput, node.visibility, options) as HtmlExportDOMOutput;
    }

    // `type: 'value'` will render the value of the textarea element
    return {element: textarea, type: 'value' as const};
}
