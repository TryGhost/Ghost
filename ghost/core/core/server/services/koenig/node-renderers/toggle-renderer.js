import {addCreateDocumentOption} from '../../utils/add-create-document-option';

function cardTemplate({node}) {
    return (
        `
        <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
            <div class="kg-toggle-heading">
                <h4 class="kg-toggle-heading-text">${node.heading}</h4>
                <button class="kg-toggle-card-icon" aria-label="Expand toggle to read content">
                    <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                    </svg>
                </button>
            </div>
            <div class="kg-toggle-content">${node.content}</div>
        </div>
        `
    );
}

function emailCardTemplate({node}) {
    return (
        `
        <div style="background: transparent;
        border: 1px solid rgba(124, 139, 154, 0.25); border-radius: 4px; padding: 20px; margin-bottom: 1.5em;">
            <h4 style="font-size: 1.375rem; font-weight: 600; margin-bottom: 8px; margin-top:0px">${node.heading}</h4>
            <div style="font-size: 1rem; line-height: 1.5; margin-bottom: -1.5em;">${node.content}</div>
        </div>
        `
    );
}

export function renderToggleNode(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    const htmlString = options.target === 'email'
        ? emailCardTemplate({node})
        : cardTemplate({node});

    const container = document.createElement('div');
    container.innerHTML = htmlString.trim();

    const element = container.firstElementChild;
    return {element};
}