const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');
const {cleanDOM} = require('../render-utils/clean-dom');
const {html} = require('../render-utils/tagged-template-fns');

function renderCalloutNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    // backgroundColor can end up with `rgba(0, 0, 0, 0)` from old mobiledoc copy/paste
    // that is invalid when used in a class name so fall back to `white` when we don't have
    // something that looks like a valid class
    if (!node.backgroundColor || !node.backgroundColor.match(/^[a-zA-Z\d-]+$/)) {
        node.backgroundColor = 'white';
    }

    const contents = cleanCalloutText(node.calloutText, document);

    const template = html`
        <div class="kg-card kg-callout-card kg-callout-card-${node.backgroundColor}">
            ${node.calloutEmoji ? html`<div class="kg-callout-emoji">${node.calloutEmoji}</div>` : ''}
            <div class="kg-callout-text">
                ${contents}
            </div>
        </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = template;

    return {element, type: 'inner'};
}

function cleanCalloutText(text, document) {
    const temporaryContainer = document.createElement('div');
    temporaryContainer.innerHTML = text;
    cleanDOM(temporaryContainer, ['A', 'STRONG', 'EM', 'B', 'I', 'BR', 'CODE', 'MARK', 'S', 'DEL', 'U', 'SUP', 'SUB']);
    return temporaryContainer.innerHTML;
}

module.exports = renderCalloutNode;
