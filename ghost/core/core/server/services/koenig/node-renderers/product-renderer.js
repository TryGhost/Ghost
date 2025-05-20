import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';
import {getResizedImageDimensions} from '../../utils/get-resized-image-dimensions';

export function renderProductNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    if (node.isEmpty()) {
        return renderEmptyContainer(document);
    }

    let buttonBorderRadius = '5px';

    // we're switching to 6px by default as part of settings being added
    // TODO: remove 'rounded' check and switch default above to 6px
    if (options.design?.buttonCorners === 'rounded') {
        buttonBorderRadius = '6px';
    } else if (options.design?.buttonCorners === 'square') {
        buttonBorderRadius = '0px';
    } else if (options.design?.buttonCorners === 'pill') {
        buttonBorderRadius = '9999px';
    }

    const templateData = {
        ...node.getDataset(),
        starIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg>`,
        buttonBorderRadius
    };

    const starActiveClasses = 'kg-product-card-rating-active';
    for (let i = 1; i <= 5; i++) {
        templateData['star' + i] = '';
        if (node.productStarRating >= i) {
            templateData['star' + i] = starActiveClasses;
        }
    }

    const htmlString = options.target === 'email'
        ? emailCardTemplate({data: templateData, feature: options.feature})
        : cardTemplate({data: templateData, feature: options.feature});

    const element = document.createElement('div');
    element.innerHTML = htmlString.trim();

    return {element: element.firstElementChild};
}

export function cardTemplate({data}) {
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

export function emailCardTemplate({data, feature}) {
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

    if (feature?.emailCustomization || feature?.emailCustomizationAlpha) {
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
                                        <img src="${`https://static.ghost.org/v4.0.0/images/star-rating-${data.productStarRating}.png`}" border="0" />
                                    </td>
                                </tr>
                            ` : ''}
                            <tr>
                                <td class="kg-product-description-wrapper">${data.productDescription}</td>
                            </tr>
                            ${data.productButtonEnabled ? `
                                <tr>
                                    <td class="kg-product-button-wrapper">
                                        <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" width="100%">
                                                    <a href="${data.productUrl}">${data.productButton}</a>
                                                </td>
                                            </tr>
                                        </table>
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

    return (
        `
         <table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #E9E9E9; border-radius: 5px; margin: 0 0 1.5em; width: 100%;">
            ${data.productImageSrc ? `
                <tr>
                    <td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                        <img src="${data.productImageSrc}" ${imageDimensions ? `width="${imageDimensions.width}"` : ''} ${imageDimensions ? `height="${imageDimensions.height}"` : ''} style="display: block; width: 100%; height: auto; max-width: 100%; border: none; padding-bottom: 16px;" border="0"/>
                    </td>
                </tr>
            ` : ''}
            <tr>
                <td valign="top">
                    <h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">${data.productTitle}</h4>
                </td>
            </tr>
            ${data.productRatingEnabled ? `
                <tr style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                    <td valign="top">
                        <img src="${`https://static.ghost.org/v4.0.0/images/star-rating-${data.productStarRating}.png`}" style="border: none; width: 96px;" border="0" />
                    </td>
                </tr>
            ` : ''}
            <tr>
                <td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                    <div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">${data.productDescription}</div>
                </td>
            </tr>
            ${data.productButtonEnabled ? `
                <tr>
                    <td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                        <div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;">
                            <a href="${data.productUrl}" style="overflow-wrap: anywhere;border: solid 1px;border-radius: ${data.buttonBorderRadius};box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 0;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;"><span style="display: block;padding: 12px 25px;">${data.productButton}</span></a>
                        </div>
                    </td>
                </tr>
            ` : ''}
        </table>
        `
    );
}
