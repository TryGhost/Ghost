const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo, assertPrettifiedIncludes} = require('../test-utils');

describe('services/koenig/node-renderers/product-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            productImageSrc: '/content/images/2022/11/koenig-lexical.jpg',
            productImageWidth: 200,
            productImageHeight: 100,
            productTitle: 'This is a <b>title</b>',
            productDescription: 'This is a <b>description</b>',
            productRatingEnabled: true,
            productButtonEnabled: true,
            productButton: 'Button text',
            productUrl: 'https://google.com/',
            productStarRating: 3,
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('product', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('product', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-product-card">
                    <div class="kg-product-card-container">
                        <img src="/content/images/2022/11/koenig-lexical.jpg" width="200" height="100" class="kg-product-card-image" loading="lazy">
                        <div class="kg-product-card-title-container">
                            <h4 class="kg-product-card-title">This is a <b>title</b></h4>
                        </div>
                        <div class="kg-product-card-rating">
                            <span class="kg-product-card-rating-active kg-product-card-rating-star">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path>
                                </svg>
                            </span>
                            <span class="kg-product-card-rating-active kg-product-card-rating-star">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path>
                                </svg>
                            </span>
                            <span class="kg-product-card-rating-active kg-product-card-rating-star">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path>
                                </svg>
                            </span>
                            <span class=" kg-product-card-rating-star">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path>
                                </svg>
                            </span>
                            <span class=" kg-product-card-rating-star">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path>
                                </svg>
                            </span>
                        </div>
                        <div class="kg-product-card-description">This is a <b>description</b></div>
                        <a href="https://google.com/" class="kg-product-card-button kg-product-card-btn-accent" target="_blank"
                            rel="noopener noreferrer"><span>Button text</span></a>
                    </div>
                </div>
            `);
        });

        it('renders nothing with a missing data', function () {
            const result = renderForWeb(getTestData({isEmpty: () => true}));
            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            assertPrettifiesTo(result.html, html`
                <table class="kg-product-card" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                        <tr>
                            <td class="kg-product-card-container">
                                <table cellspacing="0" cellpadding="0" border="0">
                                    <tbody>
                                        <tr>
                                            <td class="kg-product-image" align="center">
                                                <img
                                                    src="/content/images/2022/11/koenig-lexical.jpg"
                                                    width="200"
                                                    height="100"
                                                    border="0" />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td valign="top">
                                                <h4 class="kg-product-title">This is a<b>title</b></h4>
                                            </td>
                                        </tr>
                                        <tr class="kg-product-rating">
                                            <td valign="top">
                                                <img
                                                    src="https://static.ghost.org/v4.0.0/images/star-rating-3.png"
                                                    border="0" />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="kg-product-description-wrapper">
                                                This is a<b>description</b>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="kg-product-button-wrapper">
                                                <table
                                                    class="btn"
                                                    border="0"
                                                    cellspacing="0"
                                                    cellpadding="0">
                                                    <tbody>
                                                        <tr>
                                                            <td align="center" width="100%">
                                                                <a href="https://google.com/">Button text</a>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('renders nothing with a missing data', function () {
            const result = renderForEmail(getTestData({isEmpty: () => true}), {feature: {}});
            assert.equal(result.html, '');
        });

        it('renders dark mode rating image when background is dark', function () {
            const result = renderForEmail(getTestData(), {feature: {}, design: {backgroundIsDark: true}});
            assert.ok(result.html);
            assertPrettifiedIncludes(result.html, html`
                <img src="https://static.ghost.org/v4.0.0/images/star-rating-darkmode-3.png" border="0" />
            `);
        });

        it('renders light mode rating image when background is light', function () {
            const result = renderForEmail(getTestData(), {feature: {}, design: {backgroundIsDark: false}});
            assert.ok(result.html);
            assertPrettifiedIncludes(result.html, html`
                <img src="https://static.ghost.org/v4.0.0/images/star-rating-3.png" border="0" />
            `);
        });
    });
});
