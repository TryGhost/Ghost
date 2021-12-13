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
                    productStarRating: 3,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                }
            };

            const html = `<div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src=https://example.com/images/ok.jpg class="kg-product-card-image" /><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div><div class="kg-product-card-description">This product is ok</div><a href=https://example.com/product/ok class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>`;

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

    describe('email render', function () {
        it('generates an email-friendly product card', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButton: 'Click me',
                    productButtonEnabled: true,
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://example.com/images/ok.jpg',
                    productRatingEnabled: true,
                    productStarRating: 3,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                },
                options: {
                    target: 'email'
                }
            };

            const html = `<table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #DDE1E5; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><td valign="top"><img src="https://static.ghost.org/v4.0.0/images/star-rating-3.png" style="border: none; width: 96px;" border="0"></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;"><a href="https://example.com/product/ok" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 12px 25px;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;">Click me</a></div></td></tr></table>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });

        it('generates the same card when the star-rating is disabled', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButton: 'Click me',
                    productButtonEnabled: true,
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://example.com/images/ok.jpg',
                    productRatingEnabled: false,
                    productTitle: 'Product title!',
                    productUrl: 'https://example.com/product/ok'
                },
                options: {
                    target: 'email'
                }
            };

            const html = `<table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #DDE1E5; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;"><a href="https://example.com/product/ok" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 12px 25px;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;">Click me</a></div></td></tr></table>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });

        it('allows disabling the button', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButtonEnabled: false,
                    productDescription: 'This product is ok',
                    productImageSrc: 'https://example.com/images/ok.jpg',
                    productRatingEnabled: false,
                    productTitle: 'Product title!'
                },
                options: {
                    target: 'email'
                }
            };

            const html = `<table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #DDE1E5; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr></table>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });

        it('renders without an image if the attribute isn\'t there', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    productButtonEnabled: false,
                    productDescription: 'This product is ok',
                    productRatingEnabled: false,
                    productTitle: 'Product title!'
                },
                options: {
                    target: 'email'
                }
            };

            const html = `<table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #DDE1E5; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr></table>`;

            serializer.serialize(card.render(opts)).should.equal(html);
        });
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
