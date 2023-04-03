import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderPaywallNodeToDOM(_, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();
    const paywall = document.createComment('members-only');

    return paywall;
}
