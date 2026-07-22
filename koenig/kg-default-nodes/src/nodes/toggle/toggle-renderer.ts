import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {getFirstHtmlElement} from '../../utils/get-first-html-element.js';
import {html} from '../../utils/tagged-template-fns.js';

interface ToggleNodeData {
    heading: string;
    content: string;
}

interface RenderOptions extends ExportDOMOptions {}

function cardTemplate({node}: {node: ToggleNodeData}) {
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

function emailCardTemplate({node}: {node: ToggleNodeData}) {
    return (
        html`
        <table cellspacing="0" cellpadding="0" border="0" width="100%" class="kg-toggle-card">
            <tbody>
                <tr>
                    <td class="kg-toggle-heading">
                        <h4>${node.heading}</h4>
                    </td>
                </tr>
                <tr>
                    <td class="kg-toggle-content">
                        ${node.content}
                    </td>
                </tr>
            </tbody>
        </table>
        `
    );
}

export function renderToggleNode(node: ToggleNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument!();

    const htmlString = options.target === 'email'
        ? emailCardTemplate({node})
        : cardTemplate({node});

    const container = document.createElement('div');
    container.innerHTML = htmlString.trim();

    const element = getFirstHtmlElement(container, 'renderToggleNode');
    return {element, type: 'outer' as const};
}
