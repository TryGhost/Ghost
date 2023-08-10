import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {cleanDOM} from '../../utils/clean-dom';

export function renderCalloutNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();
    const element = document.createElement('div');
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

    const allowedTags = ['A', 'STRONG', 'EM', 'B', 'I', 'BR'];
    cleanDOM(temporaryContainer, allowedTags);

    textElement.innerHTML = temporaryContainer.innerHTML;
    element.appendChild(textElement);

    return {element};
}
