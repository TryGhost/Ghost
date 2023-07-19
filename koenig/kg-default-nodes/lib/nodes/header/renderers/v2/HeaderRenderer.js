import {addCreateDocumentOption} from '../../../../utils/add-create-document-option';

function cardTemplate(nodeData) {
    const cardClasses = getCardClasses(nodeData).join(' ');

    const backgroundAccent = nodeData.backgroundColor === 'accent' ? 'kg-style-accent' : '';
    const buttonAccent = nodeData.buttonColor === 'accent' ? 'kg-style-accent' : '';
    const buttonStyle = nodeData.buttonColor !== 'accent' ? `background-color: ${nodeData.buttonColor};` : ``;
    const alignment = nodeData.alignment === 'center' ? 'kg-align-center' : '';
    const backgroundImageStyle = nodeData.backgroundColor !== 'accent' && (!nodeData.backgroundImageSrc || nodeData.layout === 'split') ? `background-color: ${nodeData.backgroundColor}` : '';

    const imgTemplate = nodeData.backgroundImageSrc ? `
        <picture><img class="kg-header-card-v2-image" src="${nodeData.backgroundImageSrc}" alt="" /></picture>
    ` : ``;
    return `
        <div class="${cardClasses} ${backgroundAccent}" style="${backgroundImageStyle};">
            ${nodeData.layout !== 'split' ? imgTemplate : ''}
            <div class="kg-header-card-v2-content">
                ${nodeData.layout === 'split' ? imgTemplate : ''}
                <div class="kg-header-card-v2-text ${alignment}">
                    <h2 class="kg-header-card-v2-heading" style="color: ${nodeData.textColor};">${nodeData.header}</h2>
                    <h3 class="kg-header-card-v2-subheading" style="color: ${nodeData.textColor};">${nodeData.subheader}</h3>
                    ${nodeData.buttonEnabled ? `<a href="${nodeData.buttonUrl}" class="kg-header-card-v2-button ${buttonAccent}" style="${buttonStyle}color: ${nodeData.buttonTextColor};">${nodeData.buttonText}</a>` : ''}
                </div>
            </div>
        </div>
        `;
}

export function renderHeaderNodeV2(dataset, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const node = {
        alignment: dataset.__alignment,
        buttonText: dataset.__buttonText,
        buttonEnabled: dataset.__buttonEnabled,
        buttonUrl: dataset.__buttonUrl,
        header: dataset.__header,
        subheader: dataset.__subheader,
        backgroundImageSrc: dataset.__backgroundImageSrc,
        backgroundSize: dataset.__backgroundSize,
        backgroundColor: dataset.__backgroundColor,
        buttonColor: dataset.__buttonColor,
        layout: dataset.__layout,
        textColor: dataset.__textColor,
        buttonTextColor: dataset.__buttonTextColor,
        swapped: dataset.__swapped
    };

    if (options.target === 'email') {
        return {element: document.createElement('div')}; // TODO
    }

    const htmlString = cardTemplate(node);

    const element = document.createElement('div');
    element.innerHTML = htmlString?.trim();

    if (node.header === '') {
        const h2Element = element.querySelector('.kg-header-card-v2-heading');
        if (h2Element) {
            h2Element.remove();
        }
    }

    if (node.subheader === '') {
        const h3Element = element.querySelector('.kg-header-card-v2-subheading');
        if (h3Element) {
            h3Element.remove();
        }
    }

    return {element: element.firstElementChild};
}

export function getCardClasses(nodeData) {
    let cardClasses = ['kg-card kg-header-card-v2'];

    if (nodeData.layout && nodeData.layout !== 'split') {
        cardClasses.push(`kg-width-${nodeData.layout}`);
    }

    if (nodeData.layout === 'split') {
        cardClasses.push('kg-layout-split kg-width-full');
    }

    if (nodeData.swapped && nodeData.layout === 'split') {
        cardClasses.push('kg-swapped');
    }

    if (nodeData.layout && nodeData.layout === 'full') {
        cardClasses.push(`kg-content-wide`);
    }

    if (nodeData.layout === 'split') {
        if (nodeData.backgroundSize === 'contain') {
            cardClasses.push('kg-content-wide');
        }
    }

    return cardClasses;
}
