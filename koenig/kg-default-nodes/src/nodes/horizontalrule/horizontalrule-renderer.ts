import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';

interface RenderOptions extends ExportDOMOptions {}

export function renderHorizontalRuleNode(_: unknown, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const element = document.createElement('hr');
    return {element, type: 'outer' as const};
}
