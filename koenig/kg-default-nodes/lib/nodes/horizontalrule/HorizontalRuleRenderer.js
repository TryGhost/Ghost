import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderHorizontalRuleNode(_, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const element = document.createElement('hr');
    return {element};
}