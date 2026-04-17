import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';

interface RenderOptions extends ExportDOMOptions {}

export type PaywallExportDOMOutput = ExportDOMOutput<HTMLDivElement, 'inner'>;

export function renderPaywallNode(_: unknown, options: RenderOptions = {}): PaywallExportDOMOutput {
    addCreateDocumentOption(options);
    const document = options.createDocument!();
    const element = document.createElement('div');

    element.appendChild(document.createComment('members-only'));

    // `type: 'inner'` will render only the innerHTML of the element
    // @see @tryghost/kg-lexical-html-renderer package
    return {element, type: 'inner' as const};
}
