import type {ExportDOMOptions} from '../export-dom.js';

// If we're in a browser environment, we can use the global document object,
// but if we're in a non-browser environment, we need to be passed a `createDocument` function
export function addCreateDocumentOption(options: ExportDOMOptions) {
    if (!options.createDocument && options.dom) {
        const dom = options.dom;
        options.createDocument = function () {
            return dom.window.document;
        };
    }

    if (!options.createDocument) {
        /* c8 ignore start */
        const document = typeof window !== 'undefined' && window.document;

        if (!document) {
            throw new Error('Must be passed a `createDocument` function as an option when used in a non-browser environment');
        }

        options.createDocument = function () {
            return document;
        };
        /* c8 ignore end */
    }
}
