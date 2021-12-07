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
    dedent
} = require('../utils');

module.exports = {
    name: 'product',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.productTitle && !payload.productDescription) {
            return dom.createTextNode('');
        }

        const template = hbs`
        <div class="kg-card kg-embed-card kg-product-card-container">
            <div class="kg-product-card">
                {{#if productImageEnabled}}
                    <img src={{productImageSrc}} class="kg-product-card-image" />
                {{/if}}
                <div class="kg-product-card-header">
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
                </div>
                <p class="kg-product-card-description">{{{productDescription}}}</p>
                {{#if productButtonEnabled}}
                    <a href={{productUrl}} class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer">
                        <span>
                            {{productButton}}
                        </span>
                    </a>
                {{/if}}
            </div>
        </div>
        `;

        const filteredPayload = {
            productButtonEnabled: payload.productButtonEnabled && payload.productButton && payload.productUrl,
            productRatingEnabled: payload.productRatingEnabled,
            productImageEnabled: Boolean(payload.productImageSrc),

            productImageSrc: payload.productImageSrc,
            productTitle: payload.productTitle,
            productStarRating: payload.productStarRating,
            productDescription: payload.productDescription,
            productButton: payload.productButton,
            productUrl: payload.productUrl,

            starIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg>`
        };

        const starActiveClasses = 'kg-product-card-rating-active';
        for (let i = 1; i <= 5; i++) {
            filteredPayload['star' + i] = '';
            if (payload.productStarRating > i) {
                filteredPayload['star' + i] = starActiveClasses;
            }
        }

        const html = dedent(template(filteredPayload));

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
