// WIP
export function renderAudioNodeToDOM(node, options = {}) {
    /* c8 ignore start */
    if (!options.createDocument) {
        let document = typeof window !== 'undefined' && window.document;

        if (!document) {
            throw new Error('renderAudioNodeToDOM() must be passed a `createDocument` function as an option when used in a non-browser environment'); // eslint-disable-line
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

    const audio = document.createElement('audio');
    audio.setAttribute('src', node.getSrc());

    return audio;
}
