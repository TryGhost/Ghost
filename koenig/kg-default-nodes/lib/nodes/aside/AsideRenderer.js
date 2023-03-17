import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderAsideToDOM(_, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    const aside = document.createElement('aside');
    return aside;
}
