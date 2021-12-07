// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/product');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Product card', function () {
    describe('front-end render', function () {
        it('renders the product nodes with card wrapper element', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButton: 'Click me',
                    productButtonEnabled: true,
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://example.com/images/ok.jpg',
                    productRatingEnabled: true,
                    productStarRating: 4,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                }
            };

            const html = `<div class="kg-product-card"><img src=https://example.com/images/ok.jpg class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div></div><p class="kg-product-card-description">This product is ok</p><a href=https://example.com/product/ok class="gh-btn gh-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });
    });

    it('renders nothing if productText and productDescription is missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                productText: '',
                productDescription: ''
            }
        };

        serializer.serialize(card.render(opts)).should.equal('');
    });

    it('transforms product urls absolute to relative', function () {
        let payload = {
            productButton: 'Click me',
            productButtonEnabled: false,
            productDescription: '<a href="https://ghost.org/">Home</a>',
            productRatingEnabled: false,
            productImageSrc: 'https://ghost.org/',
            productTitle: '<a href="https://ghost.org/">Home</a>',
            productUrl: 'https://ghost.org/'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'https://ghost.org'});

        transformed.productTitle.should.equal('<a href="/">Home</a>');
        transformed.productDescription.should.equal('<a href="/">Home</a>');
        transformed.productUrl.should.equal('/');
        transformed.productImageSrc.should.equal('/');
    });

    it('transforms product urls relative to absolute', function () {
        let payload = {
            productButton: 'Click me',
            productButtonEnabled: false,
            productDescription: '<a href="/">Home</a>',
            productRatingEnabled: false,
            productImageSrc: '/',
            productTitle: '<a href="/">Home</a>',
            productUrl: '/'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'https://ghost.org'});

        transformed.productTitle.should.equal('<a href="https://ghost.org/">Home</a>');
        transformed.productDescription.should.equal('<a href="https://ghost.org/">Home</a>');
        transformed.productUrl.should.equal('https://ghost.org/');
        transformed.productImageSrc.should.equal('https://ghost.org/');
    });

    it('transforms product urls to transform ready', function () {
        let payload = {
            productButton: 'Click me',
            productButtonEnabled: false,
            productDescription: '<a href="/">Home</a>',
            productRatingEnabled: false,
            productImageSrc: '/',
            productTitle: '<a href="/">Home</a>',
            productUrl: '/'
        };

        const transformed = card.toTransformReady(payload, {siteUrl: 'https://ghost.org'});

        transformed.productTitle.should.equal('<a href="__GHOST_URL__/">Home</a>');
        transformed.productDescription.should.equal('<a href="__GHOST_URL__/">Home</a>');
        transformed.productUrl.should.equal('__GHOST_URL__/');
        transformed.productImageSrc.should.equal('__GHOST_URL__/');
    });
});
