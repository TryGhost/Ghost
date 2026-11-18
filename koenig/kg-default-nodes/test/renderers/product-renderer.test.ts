import assert from 'node:assert/strict';
import {assertPrettifiedIncludes, assertPrettifiesTo, callRenderer, createDocument, html} from '../test-utils/index.js';

describe('renderers/product-renderer', function () {
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

    // Values containing characters that are special in HTML
    const badText = 'Go <b>now</b> & "save"';
    const badUrl = 'https://example.org/a"b>c?x=1&y=<2>';

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('product', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('product', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-product-card">
                    <div class="kg-product-card-container">
                        <img src="/content/images/2022/11/koenig-lexical.jpg" width="200" height="100" alt="" class="kg-product-card-image" loading="lazy">
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

        it('renders escaped image alt text', async function () {
            const result = renderForWeb(getTestData({productImageAlt: 'Fits "most" cameras & lenses'}));

            await assertPrettifiedIncludes(result.html, html`
                <img src="/content/images/2022/11/koenig-lexical.jpg" width="200" height="100" alt="Fits &quot;most&quot; cameras &amp; lenses" class="kg-product-card-image" loading="lazy">
            `);
        });

        it('writes button text as text', function () {
            const result = renderForWeb(getTestData({productButton: badText}));
            const button = createDocument(result.html).querySelector('.kg-product-card-button span');

            assert.equal(button?.textContent, badText);
            assert.equal(button?.children.length, 0);
        });

        it('renders a link, image and image dimensions containing special characters', function () {
            const result = renderForWeb(getTestData({productUrl: badUrl, productImageSrc: badUrl, productImageWidth: '200" x="', productImageHeight: '100>'}));
            const document = createDocument(result.html);
            const image = document.querySelector('.kg-product-card-image');
            const link = document.querySelector('.kg-product-card-button');

            assert.equal(document.body.children.length, 1);
            assert.deepEqual(image?.getAttributeNames(), ['src', 'width', 'height', 'alt', 'class', 'loading']);
            assert.equal(image?.getAttribute('src'), badUrl);
            assert.equal(image?.getAttribute('width'), '200" x="');
            assert.equal(image?.getAttribute('height'), '100>');
            assert.deepEqual(link?.getAttributeNames(), ['href', 'class', 'target', 'rel']);
            assert.equal(link?.getAttribute('href'), badUrl);
        });

        it('rounds the star rating to a whole number of stars', function () {
            const activeStars = (rating: unknown) => {
                const document = createDocument(renderForWeb(getTestData({productStarRating: rating})).html);
                assert.equal(document.querySelectorAll('.kg-product-card-rating-star').length, 5);
                return document.querySelectorAll('.kg-product-card-rating-active').length;
            };

            assert.equal(activeStars(3.6), 4);
            assert.equal(activeStars(9), 5);
            assert.equal(activeStars('4" x="'), 0);
        });

        it('renders nothing with a missing data', function () {
            const result = renderForWeb(getTestData({isEmpty: () => true}));
            assert.equal(result.html, '');
        });

        it('renders with only a title', async function () {
            const result = renderForWeb({
                productImageSrc: '',
                productImageWidth: null,
                productImageHeight: null,
                productTitle: 'Just a title',
                productDescription: '',
                productRatingEnabled: false,
                productStarRating: 5,
                productButtonEnabled: false,
                productButton: '',
                productUrl: ''
            });

            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-product-card">
                    <div class="kg-product-card-container">
                        <div class="kg-product-card-title-container">
                            <h4 class="kg-product-card-title">Just a title</h4>
                        </div>
                        <div class="kg-product-card-description"></div>
                    </div>
                </div>
            `);
        });

        it('renders with only a description', async function () {
            const result = renderForWeb({
                productImageSrc: '',
                productImageWidth: null,
                productImageHeight: null,
                productTitle: '',
                productDescription: 'Just a description',
                productRatingEnabled: false,
                productStarRating: 5,
                productButtonEnabled: false,
                productButton: '',
                productUrl: ''
            });

            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-product-card">
                    <div class="kg-product-card-container">
                        <div class="kg-product-card-title-container">
                            <h4 class="kg-product-card-title"></h4>
                        </div>
                        <div class="kg-product-card-description">Just a description</div>
                    </div>
                </div>
            `);
        });

        it('renders with only a button', async function () {
            const result = renderForWeb({
                productImageSrc: '',
                productImageWidth: null,
                productImageHeight: null,
                productTitle: '',
                productDescription: '',
                productRatingEnabled: false,
                productStarRating: 5,
                productButtonEnabled: true,
                productButton: 'Button text',
                productUrl: 'https://example.com/product/ok'
            });

            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-product-card">
                    <div class="kg-product-card-container">
                        <div class="kg-product-card-title-container">
                            <h4 class="kg-product-card-title"></h4>
                        </div>
                        <div class="kg-product-card-description"></div>
                        <a href="https://example.com/product/ok" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer"><span>Button text</span></a>
                    </div>
                </div>
            `);
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            await assertPrettifiesTo(result.html, html`
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
                                                    alt=""
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

        it('renders escaped image alt text', async function () {
            const result = renderForEmail(getTestData({productImageAlt: 'Fits "most" cameras & lenses'}), {feature: {}});

            await assertPrettifiedIncludes(result.html, html`
                <img src="/content/images/2022/11/koenig-lexical.jpg" width="200" height="100" alt="Fits &quot;most&quot; cameras &amp; lenses" border="0" />
            `);
        });

        it('renders nothing with a missing data', function () {
            const result = renderForEmail(getTestData({isEmpty: () => true}), {feature: {}});
            assert.equal(result.html, '');
        });

        it('renders an image and image dimensions containing special characters', function () {
            const result = renderForEmail(getTestData({productImageSrc: badUrl, productImageWidth: '200" x="', productImageHeight: '100>'}), {feature: {}});
            const image = createDocument(result.html).querySelector('.kg-product-image img');

            assert.deepEqual(image?.getAttributeNames(), ['src', 'width', 'height', 'alt', 'border']);
            assert.equal(image?.getAttribute('src'), badUrl);
            assert.equal(image?.getAttribute('width'), '200" x="');
            assert.equal(image?.getAttribute('height'), '100>');
        });

        it('renders the rating image for a whole number of stars', function () {
            const ratingImage = (rating: unknown) => {
                const image = createDocument(renderForEmail(getTestData({productStarRating: rating}), {feature: {}}).html).querySelector('.kg-product-rating img');
                return image?.getAttribute('src');
            };

            assert.equal(ratingImage(3.6), 'https://static.ghost.org/v4.0.0/images/star-rating-4.png');
            assert.equal(ratingImage(9), 'https://static.ghost.org/v4.0.0/images/star-rating-5.png');
        });

        it('leaves the rating image out when there are no stars', function () {
            for (const rating of [0, 0.4, '4" x="']) {
                const document = createDocument(renderForEmail(getTestData({productStarRating: rating}), {feature: {}}).html);
                assert.equal(document.querySelector('.kg-product-rating'), null, String(rating));
            }
        });

        it('renders dark mode rating image when background is dark', async function () {
            const result = renderForEmail(getTestData(), {feature: {}, design: {backgroundIsDark: true}});
            assert.ok(result.html);
            await assertPrettifiedIncludes(result.html, html`
                <img src="https://static.ghost.org/v4.0.0/images/star-rating-darkmode-3.png" border="0" />
            `);
        });

        it('renders light mode rating image when background is light', async function () {
            const result = renderForEmail(getTestData(), {feature: {}, design: {backgroundIsDark: false}});
            assert.ok(result.html);
            await assertPrettifiedIncludes(result.html, html`
                <img src="https://static.ghost.org/v4.0.0/images/star-rating-3.png" border="0" />
            `);
        });

        it('renders without rating when star-rating is disabled', async function () {
            const result = renderForEmail({
                productButton: 'Click me',
                productButtonEnabled: true,
                productDescription: 'This product is ok',
                productImageSrc: 'https://example.com/images/ok.jpg',
                productImageWidth: null,
                productImageHeight: null,
                productRatingEnabled: false,
                productStarRating: 5,
                productTitle: 'Product title!',
                productUrl: 'https://example.com/product/ok'
            }, {feature: {}});

            await assertPrettifiesTo(result.html, html`
                <table class="kg-product-card" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                        <tr>
                            <td class="kg-product-card-container">
                                <table cellspacing="0" cellpadding="0" border="0">
                                    <tbody>
                                        <tr>
                                            <td class="kg-product-image" align="center">
                                                <img src="https://example.com/images/ok.jpg" alt="" border="0" />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td valign="top">
                                                <h4 class="kg-product-title">Product title!</h4>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="kg-product-description-wrapper">This product is ok</td>
                                        </tr>
                                        <tr>
                                            <td class="kg-product-button-wrapper">
                                                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                                                    <tbody>
                                                        <tr>
                                                            <td align="center" width="100%">
                                                                <a href="https://example.com/product/ok">Click me</a>
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

        it('renders without button when button is disabled', async function () {
            const result = renderForEmail({
                productButton: 'Click me',
                productButtonEnabled: false,
                productDescription: 'This product is ok',
                productImageSrc: 'https://example.com/images/ok.jpg',
                productImageWidth: null,
                productImageHeight: null,
                productRatingEnabled: false,
                productStarRating: 5,
                productTitle: 'Product title!',
                productUrl: 'https://example.com/product/ok'
            }, {feature: {}});

            await assertPrettifiesTo(result.html, html`
                <table class="kg-product-card" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                        <tr>
                            <td class="kg-product-card-container">
                                <table cellspacing="0" cellpadding="0" border="0">
                                    <tbody>
                                        <tr>
                                            <td class="kg-product-image" align="center">
                                                <img src="https://example.com/images/ok.jpg" alt="" border="0" />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td valign="top">
                                                <h4 class="kg-product-title">Product title!</h4>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="kg-product-description-wrapper">This product is ok</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('renders without an image when productImageSrc is missing', async function () {
            const result = renderForEmail({
                productButton: 'Click me',
                productButtonEnabled: false,
                productDescription: 'This product is ok',
                productImageSrc: '',
                productImageWidth: null,
                productImageHeight: null,
                productRatingEnabled: false,
                productStarRating: 5,
                productTitle: 'Product title!',
                productUrl: 'https://example.com/product/ok'
            }, {feature: {}});

            await assertPrettifiesTo(result.html, html`
                <table class="kg-product-card" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                        <tr>
                            <td class="kg-product-card-container">
                                <table cellspacing="0" cellpadding="0" border="0">
                                    <tbody>
                                        <tr>
                                            <td valign="top">
                                                <h4 class="kg-product-title">Product title!</h4>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="kg-product-description-wrapper">This product is ok</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('renders default button styles with no design option', function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            assert.ok(result.html.includes('<table class="btn" border="0" cellspacing="0" cellpadding="0">'));
        });

        it('ignores design.buttonCorners option', function () {
            // button corners are handled by the main email template styles
            const result = renderForEmail(getTestData(), {feature: {}, design: {buttonCorners: 'pill'}});

            assert.ok(!result.html.includes('border-radius'));
        });

        it('renders a button URL and text containing special characters', function () {
            const result = renderForEmail(getTestData({productUrl: badUrl, productButton: badText}));
            const link = createDocument(result.html).querySelector('table.btn a');

            assert.equal(link?.getAttribute('href'), badUrl);
            assert.equal(link?.textContent, badText);
            assert.equal(link?.children.length, 0);
        });
    });
});
