export function addCreateDocumentOption(options) {
    if (!options.createDocument) {
        /* c8 ignore start */
        let document = typeof window !== 'undefined' && window.document;

        if (!document) {
            throw new Error('renderImageNodeToDOM() must be passed a `createDocument` function as an option when used in a non-browser environment'); // eslint-disable-line
        }

        options.createDocument = function () {
            return document;
        };
        /* c8 ignore end */
    }
}
