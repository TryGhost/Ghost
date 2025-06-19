const {createDocument, html} = require('../test-utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {ProductNode, $createProductNode, $isProductNode} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [ProductNode];

describe('ProductNode', function () {
    let editor;
    let dataset;

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
        productNode.productImageSrc.should.equal(data.productImageSrc);
        productNode.productImageWidth.should.equal(data.productImageWidth);
        productNode.productImageHeight.should.equal(data.productImageHeight);
        productNode.productTitle.should.equal(data.productTitle);
        productNode.productDescription.should.equal(data.productDescription);
        productNode.productRatingEnabled.should.be.exactly(true);
        productNode.productStarRating.should.equal(5);
        productNode.productButtonEnabled.should.be.exactly(true);
        productNode.productButton.should.equal(data.productButton);
        productNode.productUrl.should.equal(data.productUrl);
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            productImageSrc: '/content/images/2022/11/koenig-lexical.jpg',
            productImageWidth: 200,
            productImageHeight: 100,
            productTitle: 'This is a <b>title</b>',
            productDescription: 'This is a <b>description</b>',
            productRatingEnabled: true,
            productButtonEnabled: true,
            productButton: 'Button text',
            productUrl: 'https://google.com/'
        };
    });

    it('matches node with $isProductNode', editorTest(function () {
        const productNode = $createProductNode(dataset);
        $isProductNode(productNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const productNode = $createProductNode(dataset);

            checkGetters(productNode, dataset);
        }));

        it('has setters for all properties', editorTest(function () {
            const productNode = $createProductNode();

            productNode.productImageSrc.should.equal('');
            productNode.productImageSrc = '/content/images/2022/11/koenig-lexical.jpg';
            productNode.productImageSrc.should.equal('/content/images/2022/11/koenig-lexical.jpg');

            should(productNode.productImageWidth).equal(null);
            productNode.productImageWidth = 600;
            productNode.productImageWidth.should.equal(600);

            should(productNode.productImageHeight).equal(null);
            productNode.productImageHeight = 700;
            productNode.productImageHeight.should.equal(700);

            productNode.productTitle.should.equal('');
            productNode.productTitle = 'Title';
            productNode.productTitle.should.equal('Title');

            productNode.productDescription.should.equal('');
            productNode.productDescription = 'Description';
            productNode.productDescription.should.equal('Description');

            productNode.productRatingEnabled.should.be.exactly(false);
            productNode.productRatingEnabled = true;
            productNode.productRatingEnabled.should.be.exactly(true);

            productNode.productStarRating.should.equal(5);
            productNode.productStarRating = 3;
            productNode.productStarRating.should.equal(3);

            productNode.productButton.should.equal('');
            productNode.productButton = 'Button text';
            productNode.productButton.should.equal('Button text');

            productNode.productUrl.should.equal('');
            productNode.productUrl = 'https://google.com/';
            productNode.productUrl.should.equal('https://google.com/');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const productNode = $createProductNode(dataset);
            const productNodeDataset = productNode.getDataset();

            productNodeDataset.should.deepEqual({
                ...dataset,
                productStarRating: 5
            });
        }));
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

    describe('isEmpty()', function () {
        it('returns true if required fields are missing', editorTest(function () {
            const productNode = $createProductNode(dataset);

            productNode.isEmpty().should.be.exactly(false);
            productNode.productImageSrc = '';
            productNode.isEmpty().should.be.exactly(false);
            productNode.productButtonEnabled = false;
            productNode.isEmpty().should.be.exactly(false);
            productNode.productTitle = '';
            productNode.isEmpty().should.be.exactly(false);
            productNode.productDescription = '';
            productNode.isEmpty().should.be.exactly(false);
            productNode.productRatingEnabled = false;
            productNode.isEmpty().should.be.exactly(true);
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const productNode = $createProductNode(dataset);
            productNode.hasEditMode().should.be.exactly(true);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            ProductNode.getType().should.equal('product');
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            ProductNode.urlTransformMap.should.deepEqual({
                productImageSrc: 'url',
                productTitle: 'html',
                productDescription: 'html'
            });
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const productNode = $createProductNode(dataset);
            const json = productNode.exportJSON();

            json.should.deepEqual({
                type: 'product',
                version: 1,
                productImageSrc: dataset.productImageSrc,
                productImageWidth: dataset.productImageWidth,
                productImageHeight: dataset.productImageHeight,
                productTitle: dataset.productTitle,
                productDescription: dataset.productDescription,
                productRatingEnabled: dataset.productRatingEnabled,
                productButtonEnabled: dataset.productButtonEnabled,
                productButton: dataset.productButton,
                productUrl: dataset.productUrl,
                productStarRating: 5
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

    describe('importDOM', function () {
        it('parses product card', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div></div><p class="kg-product-card-description">This product is ok</p><a href="https://example.com/product/ok" class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.productImageSrc.should.equal('https://example.com/images/ok.jpg');
            productNode.productTitle.should.equal('Product title!');
            productNode.productDescription.should.equal('This product is ok');
            productNode.productRatingEnabled.should.be.exactly(true);
            productNode.productStarRating.should.equal(3);
            productNode.productButtonEnabled.should.be.exactly(true);
            productNode.productButton.should.equal('Click me');
            productNode.productUrl.should.equal('https://example.com/product/ok');
        }));

        it('parses a product card with disabled star rating', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><p class="kg-product-card-description">This product is ok</p><a href="https://example.com/product/ok" class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.productImageSrc.should.equal('https://example.com/images/ok.jpg');
            productNode.productTitle.should.equal('Product title!');
            productNode.productDescription.should.equal('This product is ok');
            productNode.productRatingEnabled.should.be.exactly(false);
            productNode.productButtonEnabled.should.be.exactly(true);
            productNode.productButton.should.equal('Click me');
            productNode.productUrl.should.equal('https://example.com/product/ok');
        }));

        it('parses a product card with disabled button', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div></div><p class="kg-product-card-description">This product is ok</p></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.productImageSrc.should.equal('https://example.com/images/ok.jpg');
            productNode.productTitle.should.equal('Product title!');
            productNode.productDescription.should.equal('This product is ok');
            productNode.productRatingEnabled.should.be.exactly(false);
            productNode.productButtonEnabled.should.be.exactly(false);
        }));

        it('parses a product card with image width/height', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" width="200" height="100"/><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div></div><p class="kg-product-card-description">This product is ok</p></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.productImageSrc.should.equal('https://example.com/images/ok.jpg');
            productNode.productTitle.should.equal('Product title!');
            productNode.productDescription.should.equal('This product is ok');
            productNode.productRatingEnabled.should.be.exactly(false);
            productNode.productButtonEnabled.should.be.exactly(false);
            productNode.productImageWidth.should.equal('200');
            productNode.productImageHeight.should.equal('100');
        }));

        it('handles arbitrary whitespace in button content', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card">
                    <div class="kg-product-card-container">
                        <img src="https://example.com/images/ok.jpg" class="kg-product-card-image" />
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
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.productImageSrc.should.equal('https://example.com/images/ok.jpg');
            productNode.productTitle.should.equal('Product title!');
            productNode.productDescription.should.equal('This product is ok');
            productNode.productRatingEnabled.should.be.exactly(false);
            productNode.productButtonEnabled.should.be.exactly(true);
            productNode.productButton.should.equal('Click me');
            productNode.productUrl.should.equal('https://example.com/product/ok');
        }));

        it('handles relative urls', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card">
                    <div class="kg-product-card-container">
                        <img src="https://example.com/images/ok.jpg" class="kg-product-card-image" />
                        <div class="kg-product-card-header">
                            <div class="kg-product-card-title-container">
                                <h4 class="kg-product-card-title">Product title!</h4>
                            </div>
                        </div>
                        <p class="kg-product-card-description">This product is ok</p>
                        <a href="#/portal/signup" class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer">
                            <span>
                                Click me
                            </span>
                        </a>
                    </div>
                </div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            const productNode = nodes[0];
            $isProductNode(productNode).should.be.exactly(true);

            productNode.productImageSrc.should.equal('https://example.com/images/ok.jpg');
            productNode.productTitle.should.equal('Product title!');
            productNode.productDescription.should.equal('This product is ok');
            productNode.productRatingEnabled.should.be.exactly(false);
            productNode.productButtonEnabled.should.be.exactly(true);
            productNode.productButton.should.equal('Click me');
            productNode.productUrl.should.equal('#/portal/signup');
        }));

        it('falls through if title, description, button and image are missing', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><div class="kg-product-card-header"><div class="kg-product-card-title-container"></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div></div></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            $isProductNode(nodes[0]).should.be.exactly(false);
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createProductNode();
            node.getTextContent().should.equal('');

            node.productTitle = 'Product title!';
            node.getTextContent().should.equal('Product title!\n\n');

            node.productDescription = 'This product is ok';
            node.getTextContent().should.equal('Product title!\nThis product is ok\n\n');
        }));
    });
});
