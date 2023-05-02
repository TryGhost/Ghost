const {JSDOM} = require('jsdom');
const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {ProductNode, $createProductNode, $isProductNode} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [ProductNode];

describe('ProductNode', function () {
    let editor;
    let dataset;
    let exportOptions;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = testFn => function (done) {
        editor.update(() => {
            try {
                testFn();
                done();
            } catch (e) {
                done(e);
            }
        });
    };

    const checkGetters = (productNode, data) => {
        productNode.getImgSrc().should.equal(data.imgSrc);
        productNode.getImgWidth().should.equal(data.imgWidth);
        productNode.getImgHeight().should.equal(data.imgHeight);
        productNode.getTitle().should.equal(data.title);
        productNode.getDescription().should.equal(data.description);
        productNode.getIsRatingEnabled().should.be.exactly(true);
        productNode.getStarRating().should.equal(5);
        productNode.getIsButtonEnabled().should.be.exactly(true);
        productNode.getButtonText().should.equal(data.buttonText);
        productNode.getButtonUrl().should.equal(data.buttonUrl);
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            imgSrc: '/content/images/2022/11/koenig-lexical.jpg',
            imgWidth: 200,
            imgHeight: 100,
            title: 'This is a <b>title</b>',
            description: 'This is a <b>description</b>',
            isRatingEnabled: true,
            isButtonEnabled: true,
            buttonText: 'Button text',
            buttonUrl: 'https://google.com/'
        };

        exportOptions = new Object({
            createDocument: () => {
                return (new JSDOM()).window.document;
            }
        });
    });

    it('matches node with $isProductNode', editorTest(function () {
        const productNode = $createProductNode(dataset);
        $isProductNode(productNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const productNode = $createProductNode(dataset);

            checkGetters(productNode, dataset);
        }));

        it('has setters for all properties', editorTest(function () {
            const productNode = $createProductNode();

            productNode.getImgSrc().should.equal('');
            productNode.setImgSrc('/content/images/2022/11/koenig-lexical.jpg');
            productNode.getImgSrc().should.equal('/content/images/2022/11/koenig-lexical.jpg');

            should(productNode.getImgWidth()).equal(null);
            productNode.setImgWidth(600);
            productNode.getImgWidth().should.equal(600);

            should(productNode.getImgHeight()).equal(null);
            productNode.setImgHeight(700);
            productNode.getImgHeight().should.equal(700);

            productNode.getTitle().should.equal('');
            productNode.setTitle('Title');
            productNode.getTitle().should.equal('Title');

            productNode.getDescription().should.equal('');
            productNode.setDescription('Description');
            productNode.getDescription().should.equal('Description');

            productNode.getIsRatingEnabled().should.be.exactly(false);
            productNode.setIsRatingEnabled(true);
            productNode.getIsRatingEnabled().should.be.exactly(true);

            productNode.getStarRating().should.equal(5);
            productNode.setStarRating(3);
            productNode.getStarRating().should.equal(3);

            productNode.getButtonText().should.equal('');
            productNode.setButtonText('Button text');
            productNode.getButtonText().should.equal('Button text');

            productNode.getButtonUrl().should.equal('');
            productNode.setButtonUrl('https://google.com/');
            productNode.getButtonUrl().should.equal('https://google.com/');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const productNode = $createProductNode(dataset);
            const productNodeDataset = productNode.getDataset();

            productNodeDataset.should.deepEqual({
                ...dataset,
                starRating: 5
            });
        }));

        it('has isEmpty() convenience method', editorTest(function () {
            const productNode = $createProductNode(dataset);

            productNode.isEmpty().should.be.exactly(false);
            productNode.setImgSrc('');
            productNode.isEmpty().should.be.exactly(false);
            productNode.setIsButtonEnabled(false);
            productNode.isEmpty().should.be.exactly(false);
            productNode.setTitle('');
            productNode.isEmpty().should.be.exactly(false);
            productNode.setDescription('');
            productNode.isEmpty().should.be.exactly(false);
            productNode.setIsRatingEnabled(false);
            productNode.isEmpty().should.be.exactly(true);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const productNode = $createProductNode(dataset);
            const json = productNode.exportJSON();

            json.should.deepEqual({
                type: 'product',
                version: 1,
                imgSrc: dataset.imgSrc,
                imgWidth: dataset.imgWidth,
                imgHeight: dataset.imgHeight,
                title: dataset.title,
                description: dataset.description,
                isRatingEnabled: dataset.isRatingEnabled,
                isButtonEnabled: dataset.isButtonEnabled,
                buttonText: dataset.buttonText,
                buttonUrl: dataset.buttonUrl,
                starRating: 5
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'product',
                        ...dataset,
                        starRating: 5
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);

            editor.getEditorState().read(() => {
                try {
                    const [productNode] = $getRoot().getChildren();

                    checkGetters(productNode, dataset);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const productNode = $createProductNode(dataset);
            const clonedProductNode = ProductNode.clone(productNode);
            $isProductNode(clonedProductNode).should.be.exactly(true);
            clonedProductNode.should.not.be.exactly(productNode);
            checkGetters(productNode, dataset);
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const productNode = $createProductNode(dataset);
            productNode.hasEditMode().should.be.exactly(true);
        }));
    });

    describe('exportDOM', function () {
        it('renders', editorTest(function () {
            const payload = {
                buttonText: 'Click me',
                isButtonEnabled: true,
                description: 'This product is ok',
                imgSrc: 'https://example.com/images/ok.jpg',
                isRatingEnabled: true,
                starRating: 3,
                title: 'Product title!',
                buttonUrl: 'https://example.com/product/ok'
            };
            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" loading="lazy" /><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span></div><div class="kg-product-card-description">This product is ok</div><a href="https://example.com/product/ok" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `);
        }));

        it('renders with img width and height', editorTest(function () {
            const payload = {
                buttonText: 'Click me',
                isButtonEnabled: true,
                description: 'This product is ok',
                imgSrc: 'https://example.com/images/ok.jpg',
                imgWidth: 200,
                imgHeight: 100,
                isRatingEnabled: true,
                starRating: 3,
                title: 'Product title!',
                buttonUrl: 'https://example.com/product/ok'
            };
            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" width="200" height="100" class="kg-product-card-image" loading="lazy" /><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span></div><div class="kg-product-card-description">This product is ok</div><a href="https://example.com/product/ok" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `);
        }));

        it('renders nothing if title, description, button and image are missing', editorTest(function () {
            const payload = {
                title: '',
                description: ''
            };
            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM(exportOptions);

            element.textContent.should.equal('');
            should(element.outerHTML).be.undefined();
        }));

        it('renders if only title is present', editorTest(function () {
            const payload = {
                title: 'Just a title'
            };
            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Just a title</h4></div><div class="kg-product-card-description"></div></div></div>
            `);
        }));

        it('renders if only description is present', editorTest(function () {
            const payload = {
                description: 'Just a description'
            };
            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title"></h4></div><div class="kg-product-card-description">Just a description</div></div></div>
            `);
        }));

        it('renders if only button is present', editorTest(function () {
            const payload = {
                isButtonEnabled: true,
                buttonText: 'Button text',
                buttonUrl: 'https://example.com/product/ok'
            };
            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title"></h4></div><div class="kg-product-card-description"></div><a href="https://example.com/product/ok" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer"><span>Button text</span></a></div></div>
            `);
        }));

        it('renders email', editorTest(function () {
            const payload = {
                buttonText: 'Click me',
                isButtonEnabled: true,
                description: 'This product is ok',
                imgSrc: 'https://example.com/images/ok.jpg',
                isRatingEnabled: true,
                starRating: 3,
                title: 'Product title!',
                buttonUrl: 'https://example.com/product/ok'
            };

            const options = {
                target: 'email'
            };

            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(`
                <table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #E9E9E9; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tbody><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="height: auto; border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><td valign="top"><img src="https://static.ghost.org/v4.0.0/images/star-rating-3.png" style="border: none; width: 96px;" border="0"></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;"><a href="https://example.com/product/ok" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 0;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;"><span style="display: block;padding: 12px 25px;">Click me</span></a></div></td></tr></tbody></table>
            `);
        }));

        it('renders email with img width and height', editorTest(function () {
            const payload = {
                buttonText: 'Click me',
                isButtonEnabled: true,
                description: 'This product is ok',
                imgSrc: 'https://example.com/images/ok.jpg',
                imgWidth: 200,
                imgHeight: 100,
                isRatingEnabled: true,
                starRating: 3,
                title: 'Product title!',
                buttonUrl: 'https://example.com/product/ok'
            };

            const options = {
                target: 'email'
            };

            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(`
                <table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #E9E9E9; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tbody><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" width="200" height="100" style="height: auto; border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><td valign="top"><img src="https://static.ghost.org/v4.0.0/images/star-rating-3.png" style="border: none; width: 96px;" border="0"></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;"><a href="https://example.com/product/ok" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 0;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;"><span style="display: block;padding: 12px 25px;">Click me</span></a></div></td></tr></tbody></table>
            `);
        }));

        it('renders email when the star-rating is disabled', editorTest(function () {
            const payload = {
                buttonText: 'Click me',
                isButtonEnabled: true,
                description: 'This product is ok',
                imgSrc: 'https://example.com/images/ok.jpg',
                isRatingEnabled: false,
                title: 'Product title!',
                buttonUrl: 'https://example.com/product/ok'
            };

            const options = {
                target: 'email'
            };

            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(`
                <table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #E9E9E9; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tbody><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="height: auto; border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div class="btn btn-accent" style="box-sizing: border-box;display: table;width: 100%;padding-top: 16px;"><a href="https://example.com/product/ok" style="overflow-wrap: anywhere;border: solid 1px;border-radius: 5px;box-sizing: border-box;cursor: pointer;display: inline-block;font-size: 14px;font-weight: bold;margin: 0;padding: 0;text-decoration: none;color: #FFFFFF; width: 100%; text-align: center;"><span style="display: block;padding: 12px 25px;">Click me</span></a></div></td></tr></tbody></table>
            `);
        }));

        it('renders email when the button is disabled', editorTest(function () {
            const payload = {
                buttonText: 'Click me',
                isButtonEnabled: false,
                description: 'This product is ok',
                imgSrc: 'https://example.com/images/ok.jpg',
                isRatingEnabled: false,
                title: 'Product title!',
                buttonUrl: 'https://example.com/product/ok'
            };

            const options = {
                target: 'email'
            };

            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(`
                <table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #E9E9E9; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tbody><tr><td align="center" style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><img src="https://example.com/images/ok.jpg" style="height: auto; border: none; padding-bottom: 16px;" border="0"></td></tr><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr></tbody></table>
            `);
        }));

        it('renders email without an image if the attribute isn\'t there', editorTest(function () {
            const payload = {
                buttonText: 'Click me',
                isButtonEnabled: false,
                description: 'This product is ok',
                isRatingEnabled: false,
                title: 'Product title!',
                buttonUrl: 'https://example.com/product/ok'
            };

            const options = {
                target: 'email'
            };

            const productNode = $createProductNode(payload);
            const {element} = productNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(`
                <table cellspacing="0" cellpadding="0" border="0" style="width:100%; padding:20px; border:1px solid #E9E9E9; border-radius: 5px; margin: 0 0 1.5em; width: 100%;"><tbody><tr><td valign="top"><h4 style="font-size: 22px !important; margin-top: 0 !important; margin-bottom: 0 !important; font-weight: 700;">Product title!</h4></td></tr><tr><td style="padding-top:0; padding-bottom:0; margin-bottom:0; padding-bottom:0;"><div style="padding-top: 8px; opacity: 0.7; font-size: 17px; line-height: 1.4; margin-bottom: -24px;">This product is ok</div></td></tr></tbody></table>
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses product card', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src=https://example.com/images/ok.jpg class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div></div><p class="kg-product-card-description">This product is ok</p><a href="https://example.com/product/ok" class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.getImgSrc().should.equal('https://example.com/images/ok.jpg');
            productNode.getTitle().should.equal('Product title!');
            productNode.getDescription().should.equal('This product is ok');
            productNode.getIsRatingEnabled().should.be.exactly(true);
            productNode.getStarRating().should.equal(3);
            productNode.getIsButtonEnabled().should.be.exactly(true);
            productNode.getButtonText().should.equal('Click me');
            productNode.getButtonUrl().should.equal('https://example.com/product/ok');
        }));

        it('parses a product card with disabled star rating', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src=https://example.com/images/ok.jpg class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><p class="kg-product-card-description">This product is ok</p><a href="https://example.com/product/ok" class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.getImgSrc().should.equal('https://example.com/images/ok.jpg');
            productNode.getTitle().should.equal('Product title!');
            productNode.getDescription().should.equal('This product is ok');
            productNode.getIsRatingEnabled().should.be.exactly(false);
            productNode.getIsButtonEnabled().should.be.exactly(true);
            productNode.getButtonText().should.equal('Click me');
            productNode.getButtonUrl().should.equal('https://example.com/product/ok');
        }));

        it('parses a product card with disabled button', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src=https://example.com/images/ok.jpg class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div></div><p class="kg-product-card-description">This product is ok</p></div></div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.getImgSrc().should.equal('https://example.com/images/ok.jpg');
            productNode.getTitle().should.equal('Product title!');
            productNode.getDescription().should.equal('This product is ok');
            productNode.getIsRatingEnabled().should.be.exactly(false);
            productNode.getIsButtonEnabled().should.be.exactly(false);
        }));

        it('parses a product card with image width/height', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src=https://example.com/images/ok.jpg class="kg-product-card-image" width="200" height="100"/><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div></div><p class="kg-product-card-description">This product is ok</p></div></div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.getImgSrc().should.equal('https://example.com/images/ok.jpg');
            productNode.getTitle().should.equal('Product title!');
            productNode.getDescription().should.equal('This product is ok');
            productNode.getIsRatingEnabled().should.be.exactly(false);
            productNode.getIsButtonEnabled().should.be.exactly(false);
            productNode.getImgWidth().should.equal('200');
            productNode.getImgHeight().should.equal('100');
        }));

        it('handles arbitrary whitespace in button content', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-product-card">
                    <div class="kg-product-card-container">
                        <img src=https://example.com/images/ok.jpg class="kg-product-card-image" />
                        <div class="kg-product-card-header">
                            <div class="kg-product-card-title-container">
                                <h4 class="kg-product-card-title">Product title!</h4>
                            </div>
                        </div>
                        <p class="kg-product-card-description">This product is ok</p>
                        <a href="https://example.com/product/ok" class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer">
                            <span>
                                Click me
                            </span>
                        </a>
                    </div>
                </div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.getImgSrc().should.equal('https://example.com/images/ok.jpg');
            productNode.getTitle().should.equal('Product title!');
            productNode.getDescription().should.equal('This product is ok');
            productNode.getIsRatingEnabled().should.be.exactly(false);
            productNode.getIsButtonEnabled().should.be.exactly(true);
            productNode.getButtonText().should.equal('Click me');
            productNode.getButtonUrl().should.equal('https://example.com/product/ok');
        }));

        it('falls through if title, description, button and image are missing', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><div class="kg-product-card-header"><div class="kg-product-card-title-container"></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div></div></div></div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            $isProductNode(nodes[0]).should.be.exactly(false);
        }));
    });
});
