import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';

export function renderButtonNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    if (!node.buttonUrl || node.buttonUrl.trim() === '') {
        return renderEmptyContainer(document);
    }

    if (options.target === 'email') {
        return emailTemplate(node, document);
    } else {
        return frontendTemplate(node, document);
    }
}

function frontendTemplate(node, document) {
    const cardClasses = getCardClasses(node);

    const cardDiv = document.createElement('div');
    cardDiv.setAttribute('class', cardClasses);

    const button = document.createElement('a');
    button.setAttribute('href', node.buttonUrl);
    button.setAttribute('class', 'kg-btn kg-btn-accent');
    button.textContent = node.buttonText || 'Button Title';

    cardDiv.appendChild(button);
    return {element: cardDiv};
}

function emailTemplate(node, document) {
    const parent = document.createElement('p');

    const buttonDiv = document.createElement('div');
    buttonDiv.setAttribute('class', 'btn btn-accent');
    parent.appendChild(buttonDiv);

    const table = document.createElement('table');
    table.setAttribute('border', 0);
    table.setAttribute('cellspacing', 0);
    table.setAttribute('cellpadding', 0);
    table.setAttribute('align', node.alignment);
    buttonDiv.appendChild(table);

    const row = document.createElement('tr');
    table.appendChild(row);

    const cell = document.createElement('td');
    cell.setAttribute('align', 'center');
    row.appendChild(cell);

    const button = document.createElement('a');
    button.setAttribute('href', node.buttonUrl);
    button.textContent = node.buttonText;
    cell.appendChild(button);

    return {element: parent};
}

function getCardClasses(node) {
    let cardClasses = ['kg-card kg-button-card'];

    if (node.alignment) {
        cardClasses.push(`kg-align-${node.alignment}`);
    }

    return cardClasses.join(' ');
}