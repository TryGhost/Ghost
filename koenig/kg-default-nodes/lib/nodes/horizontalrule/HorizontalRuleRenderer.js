import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderHorizontalRuleToDOM(_, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    const hr = document.createElement('hr');
    return hr;
}
