import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';
import {renderEmailButton} from '../../utils/render-helpers/email-button.js';
import {html} from '../../utils/tagged-template-fns.js';

interface ButtonNodeData {
    buttonUrl: string;
    buttonText: string;
    alignment: string;
}

interface RenderOptions extends ExportDOMOptions {}

export function renderButtonNode(node: ButtonNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    if (!node.buttonUrl || node.buttonUrl.trim() === '') {
        return renderEmptyContainer(document);
    }

    if (options.target === 'email') {
        return emailTemplate(node, options, document);
    } else {
        return frontendTemplate(node, document);
    }
}

function frontendTemplate(node: ButtonNodeData, document: Document) {
    const cardClasses = getCardClasses(node);

    const cardDiv = document.createElement('div');
    cardDiv.setAttribute('class', cardClasses);

    const button = document.createElement('a');
    button.setAttribute('href', node.buttonUrl);
    button.setAttribute('class', 'kg-btn kg-btn-accent');
    button.textContent = node.buttonText || 'Button Title';

    cardDiv.appendChild(button);
    return {element: cardDiv, type: 'outer' as const};
}

function emailTemplate(node: ButtonNodeData, options: RenderOptions, document: Document) {
    const {buttonUrl, buttonText} = node;

    let cardHtml;
    if (options.feature?.emailCustomization) {
        cardHtml = html`
        <table border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td>
                    <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0" align="${node.alignment}">
                        <tr>
                            <td align="center">
                                <a href="${buttonUrl}">${buttonText}</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>`;

        const element = document.createElement('p');
        element.innerHTML = cardHtml;
        return {element, type: 'outer' as const};
    } else if (options.feature?.emailCustomizationAlpha) {
        const buttonHtml = renderEmailButton({
            alignment: node.alignment,
            color: 'accent',
            url: buttonUrl,
            text: buttonText
        });

        cardHtml = html`
        <table border="0" cellpadding="0" cellspacing="0">
            <tbody>
                <tr>
                    <td>
                        ${buttonHtml}
                    </td>
                </tr>
            </tbody>
        </table>
        `;

        const element = document.createElement('div');
        element.innerHTML = cardHtml;
        return {element, type: 'inner' as const};
    } else {
        cardHtml = html`
        <div class="btn btn-accent">
            <table border="0" cellspacing="0" cellpadding="0" align="${node.alignment}">
                <tr>
                    <td align="center">
                        <a href="${buttonUrl}">${buttonText}</a>
                    </td>
                </tr>
            </table>
        </div>
        `;

        const element = document.createElement('p');
        element.innerHTML = cardHtml;
        return {element, type: 'outer' as const};
    }
}

function getCardClasses(node: ButtonNodeData) {
    const cardClasses = ['kg-card kg-button-card'];

    if (node.alignment) {
        cardClasses.push(`kg-align-${node.alignment}`);
    }

    return cardClasses.join(' ');
}
