import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';
import {removeSpaces, removeCodeWrappersFromHelpers, wrapReplacementStrings} from '../../utils/replacement-strings.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';

interface EmailNodeData {
    html: string;
}

interface RenderOptions extends ExportDOMOptions {}

export function renderEmailNode(node: EmailNodeData, options: RenderOptions = {}): ExportDOMOutput<'inner'> {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const html = node.html;

    if (!html || options.target !== 'email') {
        return renderEmptyContainer(document);
    }

    const cleanedHtml = wrapReplacementStrings(removeCodeWrappersFromHelpers(removeSpaces(html),document));

    const element = document.createElement('div');
    element.innerHTML = cleanedHtml;

    // `type: 'inner'` will render only the innerHTML of the element
    // @see @tryghost/kg-lexical-html-renderer package
    return {element, type: 'inner' as const};
}
