import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderPaywallNodeToDOM(_, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();
    const div = document.createElement('div');

    div.innerHTML = '<!--members-only-->';

    return div;
}
