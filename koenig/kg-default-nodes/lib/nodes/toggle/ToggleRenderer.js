import {addCreateDocumentOption} from '../../utils/add-create-document-option';

function cardTemplate({node}) {
    const content = node.getContent();
    const header = node.getHeader();

    return (
        `
        <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
            <div class="kg-toggle-heading">
                <h4 class="kg-toggle-heading-text">${header}</h4>
                <button class="kg-toggle-card-icon">
                    <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                    </svg>
                </button>
            </div>
            <div class="kg-toggle-content">${content}</div>
        </div>
        `
    );
}

function emailCardTemplate({node}) {
    const content = node.getContent();
    const header = node.getHeader();

    return (
        `
        <div style="background: transparent;
        border: 1px solid rgba(124, 139, 154, 0.25); border-radius: 4px; padding: 20px; margin-bottom: 1.5em;">
            <h4 style="font-size: 1.375rem; font-weight: 600; margin-bottom: 8px; margin-top:0px">${header}</h4>
            <div style="font-size: 1rem; line-height: 1.5; margin-bottom: -1.5em;">${content}</div>
        </div>
        `
    );
}

export function renderToggleNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    const htmlString = options.target === 'email'
        ? emailCardTemplate({node})
        : cardTemplate({node});

    const element = document.createElement('div');
    element.innerHTML = htmlString.trim();

    return element.firstElementChild;
}