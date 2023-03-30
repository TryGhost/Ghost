import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderProductNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (node.isEmpty()) {
        return document.createTextNode('');
    }

    const templateData = {
        ...node.getDataset(),
        starIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg>`
    };

    const starActiveClasses = 'kg-product-card-rating-active';
    for (let i = 1; i <= 5; i++) {
        templateData['star' + i] = '';
        if (node.getStarRating() >= i) {
            templateData['star' + i] = starActiveClasses;
        }
    }

    const htmlString = options.target === 'email'
        ? emailCardTemplate({data: templateData})
        : cardTemplate({data: templateData});

    const element = document.createElement('div');
    element.innerHTML = htmlString.trim();

    return element.firstElementChild;
}

export function cardTemplate({data}) {
    return (
        `
        <div class="kg-card kg-product-card">
            <div class="kg-product-card-container">
                ${data.imgSrc ? `<img src="${data.imgSrc}" ${data.imgWidth ? `width="${data.imgWidth}"` : ''} ${data.imgHeight ? `height="${data.imgHeight}"` : ''} class="kg-product-card-image" loading="lazy" />` : ''}
                <div class="kg-product-card-title-container">
                    <h4 class="kg-product-card-title">${data.title}</h4>
                </div>
                ${data.isRatingEnabled ? `
                    <div class="kg-product-card-rating">
                        <span class="${data.star1} kg-product-card-rating-star">${data.starIcon}</span>
                        <span class="${data.star2} kg-product-card-rating-star">${data.starIcon}</span>
                        <span class="${data.star3} kg-product-card-rating-star">${data.starIcon}</span>
                        <span class="${data.star4} kg-product-card-rating-star">${data.starIcon}</span>
                        <span class="${data.star5} kg-product-card-rating-star">${data.starIcon}</span>
                    </div>
                ` : ''}

                <div class="kg-product-card-description">${data.description}</div>
                ${data.isButtonEnabled ? `
                    <a href="${data.buttonUrl}" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer"><span>${data.buttonText}</span></a>
                ` : ''}
            </div>
        </div>
    `
    );
}

export function emailCardTemplate({data}) {
    return (
        `
         <table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #E9E9E9; border-radius: 5px; margin: 0 0 1.5em; width: 100%;">
            ${data.imgSrc ? `
                <tr>
                    <td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                        <img src="${data.imgSrc}" ${data.imgWidth ? `width="${data.imgWidth}"` : ''} ${data.imgHeight ? `height="${data.imgHeight}"` : ''} style="height: auto; border: none; padding-bottom: 16px;" border="0">
                    </td>
                </tr>
            ` : ''}
            <tr>
                <td valign="top">
                    <h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">${data.title}</h4>
                </td>
            </tr>
            ${data.isRatingEnabled ? `
                <tr style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                    <td valign="top">
                        <img src="${`https://static.ghost.org/v4.0.0/images/star-rating-${data.starRating}.png`}" style="border: none; width: 96px;" border="0">
                    </td>
                </tr>
            ` : ''}
            <tr>
                <td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                    <div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">${data.description}</div>
                </td>
            </tr>
            ${data.isButtonEnabled ? `
                <tr>
                    <td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                        <div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;">
                            <a href="${data.buttonUrl}" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 12px 25px;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;">${data.buttonText}</a>
                        </div>
                    </td>
                </tr>
            ` : ''}
        </table>
        `
    );
}
