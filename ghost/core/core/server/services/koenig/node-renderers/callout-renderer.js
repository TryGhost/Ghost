const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');
const {cleanDOM} = require('../render-utils/clean-dom');

function renderCalloutNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();
    const element = document.createElement('div');

    // backgroundColor can end up with `rgba(0, 0, 0, 0)` from old mobiledoc copy/paste
    // that is invalid when used in a class name so fall back to `white` when we don't have
    // something that looks like a valid class
    if (!node.backgroundColor || !node.backgroundColor.match(/^[a-zA-Z\d-]+$/)) {
        node.backgroundColor = 'white';
    }

    element.classList.add('kg-card', 'kg-callout-card', `kg-callout-card-${node.backgroundColor}`);

    if (node.calloutEmoji) {
        const emojiElement = document.createElement('div');
        emojiElement.classList.add('kg-callout-emoji');
        emojiElement.textContent = node.calloutEmoji;
        element.appendChild(emojiElement);
    }

    const textElement = document.createElement('div');
    textElement.classList.add('kg-callout-text');

    const temporaryContainer = document.createElement('div');
    temporaryContainer.innerHTML = node.calloutText;

    const allowedTags = ['A', 'STRONG', 'EM', 'B', 'I', 'BR', 'CODE', 'MARK', 'S', 'DEL', 'U', 'SUP', 'SUB'];
    cleanDOM(temporaryContainer, allowedTags);

    textElement.innerHTML = temporaryContainer.innerHTML;
    element.appendChild(textElement);

    return {element};
}

module.exports = renderCalloutNode;
