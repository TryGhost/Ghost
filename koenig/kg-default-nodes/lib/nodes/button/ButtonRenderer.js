export function renderButtonNodeToDOM(node, options = {}) {
    const document = options.createDocument();

    if (!node.getButtonUrl() || node.getButtonUrl().trim() === '') {
        return document.createTextNode('');
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
    button.setAttribute('href', node.getButtonUrl());
    button.setAttribute('class', 'kg-btn kg-btn-accent');
    button.textContent = node.getButtonText() || 'Button Title';

    cardDiv.appendChild(button);
    return cardDiv;
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
    table.setAttribute('alignment',node.getAlignment());
    buttonDiv.appendChild(table);
    
    const row = document.createElement('tr');
    table.appendChild(row);
    
    const cell = document.createElement('td');
    cell.setAttribute('align', 'center');
    row.appendChild(cell);
    
    const button = document.createElement('a');
    button.setAttribute('href', node.getButtonUrl());
    button.textContent = node.getButtonText();
    cell.appendChild(button);

    return parent;
}

function getCardClasses(node) {
    let cardClasses = ['kg-card kg-button-card'];

    if (node.getAlignment()) {
        cardClasses.push(`kg-align-${node.getAlignment()}`);
    }

    return cardClasses.join(' ');
}