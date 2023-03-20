export function renderCalloutNodeToDOM(node, options = {}) {
    if (!options.createDocument) {
        let document = typeof window !== 'undefined' && window.document;

        if (!document) {
            throw new Error('renderCalloutNodeToDOM() must be passed a `createDocument` function as an option when used in a non-browser environment'); // eslint-disable-line
        }

        options.createDocument = function () {
            return document;
        };
    }

    /* c8 ignore stop */

    const document = options.createDocument();

    const element = document.createElement('div');
    element.classList.add('kg-card', 'kg-callout-card', `kg-callout-card-${node.getBackgroundColor()}`);
    if (node.getHasEmoji()) {
        const emojiElement = document.createElement('div');
        emojiElement.classList.add('kg-callout-emoji');
        emojiElement.textContent = node.getEmojiValue();
        element.appendChild(emojiElement);
    }
    const textElement = document.createElement('div');
    textElement.classList.add('kg-callout-text');
    textElement.textContent = node.getText();
    element.appendChild(textElement);
    return element;
}