export function renderAsideToDOM(_, options = {}) {
    /* c8 ignore start */
    if (!options.createDocument) {
        let document = typeof window !== 'undefined' && window.document;

        if (!document) {
            throw new Error('renderAsideToDOM() must be passed a `createDocument` function as an option when used in a non-browser environment'); // eslint-disable-line
        }

        options.createDocument = function () {
            return document;
        };
    }
    /* c8 ignore stop */

    const document = options.createDocument();

    const aside = document.createElement('aside');
    return aside;
}
