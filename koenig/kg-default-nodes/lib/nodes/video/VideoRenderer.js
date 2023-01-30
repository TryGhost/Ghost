// WIP
export function renderVideoNodeToDOM(node, options = {}) {
    /* c8 ignore start */
    if (!options.createDocument) {
        let document = typeof window !== 'undefined' && window.document;

        if (!document) {
            throw new Error('renderVideoNodeToDOM() must be passed a `createDocument` function as an option when used in a non-browser environment'); // eslint-disable-line
        }

        options.createDocument = function () {
            return document;
        };
    }
    /* c8 ignore stop */

    const document = options.createDocument();

    if (!node.getSrc() || node.getSrc().trim() === '') {
        return document.createTextNode('');
    }

    const video = document.createElement('video');
    video.setAttribute('src', node.getSrc());

    return video;
}
