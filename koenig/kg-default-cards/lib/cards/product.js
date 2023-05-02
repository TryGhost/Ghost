const {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady,
    absoluteToRelative,
    relativeToAbsolute,
    toTransformReady
} = require('@tryghost/url-utils/lib/utils');
const {
    hbs,
    dedent,
    generateImgAttrs
} = require('../utils');

module.exports = {
    name: 'product',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        const productButtonEnabled = payload.productButtonEnabled && payload.productButton && payload.productUrl;

        if (!payload.productTitle && !payload.productDescription && !productButtonEnabled) {
            return dom.createTextNode('');
        }

        const frontendTemplate = hbs`
        <div class="kg-card kg-product-card">
            <div class="kg-product-card-container">
                {{#if productImageEnabled}}
                    <img {{{productImageAttrs}}} class="kg-product-card-image" loading="lazy" />
                {{/if}}
                <div class="kg-product-card-title-container">
                    <h4 class="kg-product-card-title">{{{productTitle}}}</h4>
                </div>
                {{#if productRatingEnabled}}
                <div class="kg-product-card-rating">
                    <span class="{{star1}} kg-product-card-rating-star">{{{starIcon}}}</span>
                    <span class="{{star2}} kg-product-card-rating-star">{{{starIcon}}}</span>
                    <span class="{{star3}} kg-product-card-rating-star">{{{starIcon}}}</span>
                    <span class="{{star4}} kg-product-card-rating-star">{{{starIcon}}}</span>
                    <span class="{{star5}} kg-product-card-rating-star">{{{starIcon}}}</span>
                </div>
                {{/if}}
                <div class="kg-product-card-description">{{{productDescription}}}</div>
                {{#if productButtonEnabled}}
                    <a href="{{productUrl}}" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer">
                        <span>
                            {{productButton}}
                        </span>
                    </a>
                {{/if}}
            </div>
        </div>
        `;

        const emailTemplate = hbs`
        <table cellspacing="0" cellpadding="0" border="0" class="kg-product-card">
            {{#if productImageEnabled}}
            <tr>
                <td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                    <img {{{productImageAttrs}}} style="height: auto; border: none; padding-bottom: 16px;" border="0">
                </td>
            </tr>
            {{/if}}
            <tr>
                <td valign="top">
                    <h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">{{{productTitle}}}</h4>
                </td>
            </tr>
            {{#if productRatingEnabled}}
            <tr style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                <td valign="top" class="kg-product-rating">
                    <img src="https://static.ghost.org/v4.0.0/images/star-rating-darkmode-{{productStarRating}}.png" border="0" class="is-dark-background">
                    <img src="https://static.ghost.org/v4.0.0/images/star-rating-{{productStarRating}}.png" border="0" class="is-light-background">
                </td>
            </tr>
            {{/if}}
            <tr>
                <td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                    <div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">{{{productDescription}}}</div>
                </td>
            </tr>
            {{#if productButtonEnabled}}
            <tr>
                <td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;">
                    <div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;">
                        <a href="{{productUrl}}" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 0;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;">
                            <span style="display: block;padding: 12px 25px;">{{productButton}}</span>
                        </a>
                    </div>
                </td>
            </tr>
            {{/if}}
        </table>
        `;

        const templateData = {
            productButtonEnabled,
            productRatingEnabled: payload.productRatingEnabled,
            productImageEnabled: Boolean(payload.productImageSrc),

            productImageAttrs: generateImgAttrs({
                src: payload.productImageSrc,
                width: payload.productImageWidth,
                height: payload.productImageHeight,
                options
            }),
            productTitle: payload.productTitle,
            productStarRating: payload.productStarRating,
            productDescription: payload.productDescription,
            productButton: payload.productButton,
            productUrl: payload.productUrl,

            starIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg>`
        };

        const starActiveClasses = 'kg-product-card-rating-active';
        for (let i = 1; i <= 5; i++) {
            templateData['star' + i] = '';
            if (payload.productStarRating >= i) {
                templateData['star' + i] = starActiveClasses;
            }
        }

        const renderTemplate = options.target === 'email' ? emailTemplate : frontendTemplate;
        const html = dedent(renderTemplate(templateData));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.productTitle = payload.productTitle && htmlAbsoluteToRelative(payload.productTitle, options.siteUrl, options);
        payload.productDescription = payload.productDescription && htmlAbsoluteToRelative(payload.productDescription, options.siteUrl, options);

        payload.productImageSrc = payload.productImageSrc && absoluteToRelative(payload.productImageSrc, options.siteUrl, options);
        payload.productUrl = payload.productUrl && absoluteToRelative(payload.productUrl, options.siteUrl, options);

        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.productTitle = payload.productTitle && htmlRelativeToAbsolute(payload.productTitle, options.siteUrl, options.itemUrl, options);
        payload.productDescription = payload.productDescription && htmlRelativeToAbsolute(payload.productDescription, options.siteUrl, options.itemUrl, options);

        payload.productImageSrc = payload.productImageSrc && relativeToAbsolute(payload.productImageSrc, options.siteUrl, options.itemUrl, options);
        payload.productUrl = payload.productUrl && relativeToAbsolute(payload.productUrl, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.productTitle = payload.productTitle && htmlToTransformReady(payload.productTitle, options.siteUrl, options.itemUrl, options);
        payload.productDescription = payload.productDescription && htmlToTransformReady(payload.productDescription, options.siteUrl, options.itemUrl, options);

        payload.productImageSrc = payload.productImageSrc && toTransformReady(payload.productImageSrc, options.siteUrl, options.itemUrl, options);
        payload.productUrl = payload.productUrl && toTransformReady(payload.productUrl, options.siteUrl, options.itemUrl, options);

        return payload;
    }
};
