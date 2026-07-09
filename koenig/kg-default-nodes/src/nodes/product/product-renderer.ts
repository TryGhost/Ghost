import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMFeatureOptions, ExportDOMOptions} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';
import {getFirstHtmlElement} from '../../utils/get-first-html-element.js';
import {getResizedImageDimensions} from '../../utils/get-resized-image-dimensions.js';
import {renderEmailButton} from '../../utils/render-helpers/email-button.js';

interface ProductNodeData {
    productStarRating: number;
    isEmpty: () => boolean;
    getDataset: () => ProductTemplateBaseData;
}

interface ProductRenderOptions extends ExportDOMOptions {
    design?: { backgroundIsDark?: boolean };
}

interface ProductTemplateBaseData {
    productImageSrc: string;
    productImageWidth: number | null;
    productImageHeight: number | null;
    productTitle: string;
    productDescription: string;
    productRatingEnabled: boolean;
    productStarRating: number;
    productButtonEnabled: boolean;
    productButton: string;
    productUrl: string;
}

interface ProductTemplateData extends ProductTemplateBaseData {
    starIcon: string;
    ratingImage: string;
    star1: string;
    star2: string;
    star3: string;
    star4: string;
    star5: string;
}

export function renderProductNode(node: ProductNodeData, options: ProductRenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    if (node.isEmpty()) {
        return renderEmptyContainer(document);
    }

    const dataset = node.getDataset();

    const ratingImage = options.design?.backgroundIsDark
        ? `https://static.ghost.org/v4.0.0/images/star-rating-darkmode-${dataset.productStarRating}.png`
        : `https://static.ghost.org/v4.0.0/images/star-rating-${dataset.productStarRating}.png`;

    const templateData: ProductTemplateData = {
        ...dataset,
        starIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg>`,
        ratingImage,
        productRatingEnabled: dataset.productRatingEnabled && dataset.productStarRating !== undefined,
        star1: '',
        star2: '',
        star3: '',
        star4: '',
        star5: ''
    };

    const starActiveClasses = 'kg-product-card-rating-active';
    for (let i = 1; i <= 5; i++) {
        if (node.productStarRating >= i) {
            templateData[`star${i}` as keyof Pick<ProductTemplateData, 'star1' | 'star2' | 'star3' | 'star4' | 'star5'>] = starActiveClasses;
        }
    }

    const htmlString = options.target === 'email'
        ? emailCardTemplate({data: templateData, feature: options.feature})
        : cardTemplate({data: templateData, feature: options.feature});

    const element = document.createElement('div');
    element.innerHTML = htmlString.trim();

    return {element: getFirstHtmlElement(element, 'renderProductNode'), type: 'outer' as const};
}

export function cardTemplate({data}: {data: ProductTemplateData; feature?: ExportDOMFeatureOptions}) {
    return (
        `
        <div class="kg-card kg-product-card">
            <div class="kg-product-card-container">
                ${data.productImageSrc ? `<img src="${data.productImageSrc}" ${data.productImageWidth ? `width="${data.productImageWidth}"` : ''} ${data.productImageHeight ? `height="${data.productImageHeight}"` : ''} class="kg-product-card-image" loading="lazy" />` : ''}
                <div class="kg-product-card-title-container">
                    <h4 class="kg-product-card-title">${data.productTitle}</h4>
                </div>
                ${data.productRatingEnabled ? `
                    <div class="kg-product-card-rating">
                        <span class="${data.star1} kg-product-card-rating-star">${data.starIcon}</span>
                        <span class="${data.star2} kg-product-card-rating-star">${data.starIcon}</span>
                        <span class="${data.star3} kg-product-card-rating-star">${data.starIcon}</span>
                        <span class="${data.star4} kg-product-card-rating-star">${data.starIcon}</span>
                        <span class="${data.star5} kg-product-card-rating-star">${data.starIcon}</span>
                    </div>
                ` : ''}

                <div class="kg-product-card-description">${data.productDescription}</div>
                ${data.productButtonEnabled ? `
                    <a href="${data.productUrl}" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer"><span>${data.productButton}</span></a>
                ` : ''}
            </div>
        </div>
    `
    );
}

export function emailCardTemplate({data}: {data: ProductTemplateData; feature?: ExportDOMFeatureOptions}) {
    let imageDimensions;

    if (data.productImageWidth && data.productImageHeight) {
        imageDimensions = {
            width: data.productImageWidth,
            height: data.productImageHeight
        };

        if (data.productImageWidth >= 560) {
            imageDimensions = getResizedImageDimensions(imageDimensions, {width: 560});
        }
    }

    const buttonHtml = renderEmailButton({
        text: data.productButton,
        url: data.productUrl,
        buttonWidth: '100%'
    });

    return (
        `
        <table class="kg-product-card" cellspacing="0" cellpadding="0" border="0">
            <tr>
                <td class="kg-product-card-container">
                    <table cellspacing="0" cellpadding="0" border="0">
                        ${data.productImageSrc ? `
                            <tr>
                                <td class="kg-product-image" align="center">
                                    <img src="${data.productImageSrc}" ${imageDimensions ? `width="${imageDimensions.width}"` : ''} ${imageDimensions ? `height="${imageDimensions.height}"` : ''} border="0"/>
                                </td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td valign="top">
                                <h4 class="kg-product-title">${data.productTitle}</h4>
                            </td>
                        </tr>
                        ${data.productRatingEnabled ? `
                            <tr class="kg-product-rating">
                                <td valign="top">
                                    <img src="${data.ratingImage}" border="0" />
                                </td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td class="kg-product-description-wrapper">${data.productDescription}</td>
                        </tr>
                        ${data.productButtonEnabled ? `
                            <tr>
                                <td class="kg-product-button-wrapper">
                                    ${buttonHtml}
                                </td>
                            </tr>
                        ` : ''}
                    </table>
                </td>
            </tr>
        </table>
        `
    );
}
