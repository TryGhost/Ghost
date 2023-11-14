import {addCreateDocumentOption} from '../../../../utils/add-create-document-option';
import {slugify} from '../../../../utils/slugify';
import {getSrcsetAttribute} from '../../../../utils/srcset-attribute';

function cardTemplate(nodeData, options = {}) {
    const cardClasses = getCardClasses(nodeData).join(' ');

    const backgroundAccent = nodeData.backgroundColor === 'accent' ? 'kg-style-accent' : '';
    const buttonAccent = nodeData.buttonColor === 'accent' ? 'kg-style-accent' : '';
    const buttonStyle = nodeData.buttonColor !== 'accent' ? `background-color: ${nodeData.buttonColor};` : ``;
    const alignment = nodeData.alignment === 'center' ? 'kg-align-center' : '';
    const backgroundImageStyle = nodeData.backgroundColor !== 'accent' && (!nodeData.backgroundImageSrc || nodeData.layout === 'split') ? `background-color: ${nodeData.backgroundColor}` : '';

    let imgTemplate = '';
    if (nodeData.backgroundImageSrc) {
        const bgImage = {
            src: nodeData.backgroundImageSrc,
            width: nodeData.backgroundImageWidth,
            height: nodeData.backgroundImageHeight
        };

        const srcsetValue = getSrcsetAttribute({...bgImage, options});
        const srcset = srcsetValue ? `srcset="${srcsetValue}"` : '';

        imgTemplate = `
            <picture><img class="kg-header-card-image" src="${bgImage.src}" ${srcset} loading="lazy" alt="" /></picture>
        `;
    }

    const header = () => {
        if (nodeData.header) {
            return `<h2 id="${slugify(nodeData.header)}" class="kg-header-card-heading" style="color: ${nodeData.textColor};" data-text-color="${nodeData.textColor}">${nodeData.header}</h2>`;
        }
        return '';
    };

    const subheader = () => {
        if (nodeData.subheader) {
            return `<p id="${slugify(nodeData.subheader)}" class="kg-header-card-subheading" style="color: ${nodeData.textColor};" data-text-color="${nodeData.textColor}">${nodeData.subheader}</p>`;
        }
        return '';
    };

    const button = () => {
        if (nodeData.buttonEnabled && nodeData.buttonUrl && nodeData.buttonUrl.trim() !== '') {
            return `<a href="${nodeData.buttonUrl}" class="kg-header-card-button ${buttonAccent}" style="${buttonStyle}color: ${nodeData.buttonTextColor};" data-button-color="${nodeData.buttonColor}" data-button-text-color="${nodeData.buttonTextColor}">${nodeData.buttonText}</a>`;
        }
        return '';
    };

    const wrapperStyle = backgroundImageStyle ? `style="${backgroundImageStyle};"` : '';

    return `
        <div class="${cardClasses} ${backgroundAccent}" ${wrapperStyle} data-background-color="${nodeData.backgroundColor}">
            ${nodeData.layout !== 'split' ? imgTemplate : ''}
            <div class="kg-header-card-content">
                ${nodeData.layout === 'split' ? imgTemplate : ''}
                <div class="kg-header-card-text ${alignment}">
                    ${header()}
                    ${subheader()}
                    ${button()}
                </div>
            </div>
        </div>
        `;
}

function emailTemplate(nodeData) {
    const backgroundAccent = nodeData.backgroundColor === 'accent' ? `background-color: ${nodeData.accentColor};` : '';
    const buttonAccent = nodeData.buttonColor === 'accent' ? `background-color: ${nodeData.accentColor};` : nodeData.buttonColor;
    const buttonStyle = nodeData.buttonColor !== 'accent' ? `background-color: ${nodeData.buttonColor};` : '';
    const alignment = nodeData.alignment === 'center' ? 'text-align: center;' : '';
    const backgroundImageStyle = nodeData.backgroundImageSrc ? (nodeData.layout !== 'split' ? `background-image: url(${nodeData.backgroundImageSrc}); background-size: cover; background-position: center center;` : `background-color: ${nodeData.backgroundColor};`) : `background-color: ${nodeData.backgroundColor};`;
    const splitImageStyle = `background-image: url(${nodeData.backgroundImageSrc}); background-size: ${nodeData.backgroundSize !== 'contain' ? 'cover' : '40%'}; background-position: center`;

    return `
        <div class="kg-header-card kg-v2" style="color:${nodeData.textColor}; ${alignment} ${backgroundImageStyle} ${backgroundAccent}">
            ${nodeData.layout === 'split' && nodeData.backgroundImageSrc ? `
                <div class="kg-header-card-image" background="${nodeData.backgroundImageSrc}" style="${splitImageStyle}"></div>
            ` : ''}
            <div class="kg-header-card-content" style="${nodeData.layout === 'split' && nodeData.backgroundSize === 'contain' ? 'padding-top: 0;' : ''}">
                <h2 class="kg-header-card-heading" style="color:${nodeData.textColor};">${nodeData.header}</h2>
                <p class="kg-header-card-subheading" style="color:${nodeData.textColor};">${nodeData.subheader}</p>
                ${nodeData.buttonEnabled && nodeData.buttonUrl && nodeData.buttonUrl.trim() !== '' ? `
                    <a class="kg-header-card-button" href="${nodeData.buttonUrl}" style="color: ${nodeData.buttonTextColor}; ${buttonStyle} ${buttonAccent}">${nodeData.buttonText}</a>
                ` : ''}
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
        backgroundImageWidth: dataset.__backgroundImageWidth,
        backgroundImageHeight: dataset.__backgroundImageHeight,
        backgroundSize: dataset.__backgroundSize,
        backgroundColor: dataset.__backgroundColor,
        buttonColor: dataset.__buttonColor,
        layout: dataset.__layout,
        textColor: dataset.__textColor,
        buttonTextColor: dataset.__buttonTextColor,
        swapped: dataset.__swapped,
        accentColor: dataset.__accentColor
    };

    if (options.target === 'email') {
        const emailDoc = options.createDocument();
        const emailDiv = emailDoc.createElement('div');

        emailDiv.innerHTML = emailTemplate(node, options)?.trim();

        return {element: emailDiv.firstElementChild};
        // return {element: document.createElement('div')}; // TODO
    }

    const htmlString = cardTemplate(node, options);

    const element = document.createElement('div');
    element.innerHTML = htmlString?.trim();

    if (node.header === '') {
        const h2Element = element.querySelector('.kg-header-card-heading');
        if (h2Element) {
            h2Element.remove();
        }
    }

    if (node.subheader === '') {
        const pElement = element.querySelector('.kg-header-card-subheading');
        if (pElement) {
            pElement.remove();
        }
    }

    return {element: element.firstElementChild};
}

export function getCardClasses(nodeData) {
    let cardClasses = ['kg-card kg-header-card kg-v2'];

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
