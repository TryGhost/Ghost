import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot} from 'lexical';
import type {LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {ProductNode, $createProductNode, $isProductNode} from '../../src/index.js';
import {$generateNodesFromDOM} from '@lexical/html';

const editorNodes = [ProductNode];

describe('ProductNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: Record<string, unknown>;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => () => new Promise<void>((resolve, reject) => {
        editor.update(() => {
            try {
                testFn();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

    const checkGetters = (productNode: ProductNode, data: Record<string, unknown>) => {
        expect(productNode.productImageSrc).toBe(data.productImageSrc);
        expect(productNode.productImageWidth!).toBe(data.productImageWidth);
        expect(productNode.productImageHeight!).toBe(data.productImageHeight);
        expect(productNode.productTitle).toBe(data.productTitle);
        expect(productNode.productDescription).toBe(data.productDescription);
        expect(productNode.productRatingEnabled).toBe(true);
        expect(productNode.productStarRating).toBe(5);
        expect(productNode.productButtonEnabled).toBe(true);
        expect(productNode.productButton).toBe(data.productButton);
        expect(productNode.productUrl).toBe(data.productUrl);
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

        exportOptions = {
            dom
        };
    });

    it('matches node with $isProductNode', editorTest(function () {
        const productNode = $createProductNode(dataset);
        expect($isProductNode(productNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const productNode = $createProductNode(dataset);

            checkGetters(productNode, dataset);
        }));

        it('has setters for all properties', editorTest(function () {
            const productNode = $createProductNode();

            expect(productNode.productImageSrc).toBe('');
            productNode.productImageSrc = '/content/images/2022/11/koenig-lexical.jpg';
            expect(productNode.productImageSrc).toBe('/content/images/2022/11/koenig-lexical.jpg');

            expect(productNode.productImageWidth).toBe(null);
            productNode.productImageWidth = 600;
            expect(productNode.productImageWidth).toBe(600);

            expect(productNode.productImageHeight).toBe(null);
            productNode.productImageHeight = 700;
            expect(productNode.productImageHeight).toBe(700);

            expect(productNode.productTitle).toBe('');
            productNode.productTitle = 'Title';
            expect(productNode.productTitle).toBe('Title');

            expect(productNode.productDescription).toBe('');
            productNode.productDescription = 'Description';
            expect(productNode.productDescription).toBe('Description');

            expect(productNode.productRatingEnabled).toBe(false);
            productNode.productRatingEnabled = true;
            expect(productNode.productRatingEnabled).toBe(true);

            expect(productNode.productStarRating).toBe(5);
            productNode.productStarRating = 3;
            expect(productNode.productStarRating).toBe(3);

            expect(productNode.productButton).toBe('');
            productNode.productButton = 'Button text';
            expect(productNode.productButton).toBe('Button text');

            expect(productNode.productUrl).toBe('');
            productNode.productUrl = 'https://google.com/';
            expect(productNode.productUrl).toBe('https://google.com/');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const productNode = $createProductNode(dataset);
            const productNodeDataset = productNode.getDataset();

            expect(productNodeDataset).toEqual({
                ...dataset,
                productStarRating: 5
            });
        }));
    });

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const productNode = $createProductNode(dataset);
            const clonedProductNode = ProductNode.clone(productNode);
            expect($isProductNode(clonedProductNode)).toBe(true);
            expect(clonedProductNode).not.toBe(productNode);
            checkGetters(productNode, dataset);
        }));
    });

    describe('isEmpty()', function () {
        it('returns true if required fields are missing', editorTest(function () {
            const productNode = $createProductNode(dataset);

            expect(productNode.isEmpty()).toBe(false);
            productNode.productImageSrc = '';
            expect(productNode.isEmpty()).toBe(false);
            productNode.productButtonEnabled = false;
            expect(productNode.isEmpty()).toBe(false);
            productNode.productTitle = '';
            expect(productNode.isEmpty()).toBe(false);
            productNode.productDescription = '';
            expect(productNode.isEmpty()).toBe(false);
            productNode.productRatingEnabled = false;
            expect(productNode.isEmpty()).toBe(true);
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const productNode = $createProductNode(dataset);
            expect(productNode.hasEditMode()).toBe(true);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(ProductNode.getType()).toBe('product');
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(ProductNode.urlTransformMap).toEqual({
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

            expect(json).toEqual({
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
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
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
                        const [productNode] = $getRoot().getChildren() as ProductNode[];

                        checkGetters(productNode, dataset);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('exportDOM', function () {
        it('renders', editorTest(function () {
            const payload = {
                productButton: 'Click me',
                productButtonEnabled: true,
                productDescription: 'This product is ok',
                productImageSrc: 'https://example.com/images/ok.jpg',
                productRatingEnabled: true,
                productStarRating: 3,
                productTitle: 'Product title!',
                productUrl: 'https://example.com/product/ok'
            };
            const productNode = $createProductNode(payload);
            const result = productNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;

            assertPrettifiesTo(element.outerHTML, `
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" loading="lazy" /><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"></path></svg></span></div><div class="kg-product-card-description">This product is ok</div><a href="https://example.com/product/ok" class="kg-product-card-button kg-product-card-btn-accent" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `);
        }));

        it('renders email', editorTest(function () {
            const payload = {
                productButton: 'Click me',
                productButtonEnabled: true,
                productDescription: 'This product is ok',
                productImageSrc: 'https://example.com/images/ok.jpg',
                productRatingEnabled: true,
                productStarRating: 3,
                productTitle: 'Product title!',
                productUrl: 'https://example.com/product/ok'
            };

            const options = {
                target: 'email'
            };

            const productNode = $createProductNode(payload);
            const result = productNode.exportDOM(editor, {...exportOptions, ...options});
            const element = result.element as HTMLElement;

            assertPrettifiesTo(element.outerHTML, `
                <table class="kg-product-card" cellspacing="0" cellpadding="0" border="0"><tbody><tr><td class="kg-product-card-container"><table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td class="kg-product-image" align="center"><img src="https://example.com/images/ok.jpg" border="0"></td></tr><tr><td valign="top"><h4 class="kg-product-title">Product title!</h4></td></tr><tr class="kg-product-rating"><td valign="top"><img src="https://static.ghost.org/v4.0.0/images/star-rating-3.png" border="0"></td></tr><tr><td class="kg-product-description-wrapper">This product is ok</td></tr><tr><td class="kg-product-button-wrapper"><table class="btn" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td align="center" width="100%"><a href="https://example.com/product/ok">Click me</a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses product card', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div></div><p class="kg-product-card-description">This product is ok</p><a href="https://example.com/product/ok" class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect(nodes.length).toBe(1);

            const productNode = nodes[0] as ProductNode;
            expect($isProductNode(productNode)).toBe(true);

            expect(productNode.productImageSrc).toBe('https://example.com/images/ok.jpg');
            expect(productNode.productTitle).toBe('Product title!');
            expect(productNode.productDescription).toBe('This product is ok');
            expect(productNode.productRatingEnabled).toBe(true);
            expect(productNode.productStarRating).toBe(3);
            expect(productNode.productButtonEnabled).toBe(true);
            expect(productNode.productButton).toBe('Click me');
            expect(productNode.productUrl).toBe('https://example.com/product/ok');
        }));

        it('parses a product card with disabled star rating', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div><p class="kg-product-card-description">This product is ok</p><a href="https://example.com/product/ok" class="kg-btn kg-btn-accent kg-product-card-button" target="_blank" rel="noopener noreferrer"><span>Click me</span></a></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect(nodes.length).toBe(1);

            const productNode = nodes[0] as ProductNode;
            expect($isProductNode(productNode)).toBe(true);

            expect(productNode.productImageSrc).toBe('https://example.com/images/ok.jpg');
            expect(productNode.productTitle).toBe('Product title!');
            expect(productNode.productDescription).toBe('This product is ok');
            expect(productNode.productRatingEnabled).toBe(false);
            expect(productNode.productButtonEnabled).toBe(true);
            expect(productNode.productButton).toBe('Click me');
            expect(productNode.productUrl).toBe('https://example.com/product/ok');
        }));

        it('parses a product card with disabled button', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" /><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div></div><p class="kg-product-card-description">This product is ok</p></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect(nodes.length).toBe(1);

            const productNode = nodes[0] as ProductNode;
            expect($isProductNode(productNode)).toBe(true);

            expect(productNode.productImageSrc).toBe('https://example.com/images/ok.jpg');
            expect(productNode.productTitle).toBe('Product title!');
            expect(productNode.productDescription).toBe('This product is ok');
            expect(productNode.productRatingEnabled).toBe(false);
            expect(productNode.productButtonEnabled).toBe(false);
        }));

        it('parses a product card with image width/height', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" width="200" height="100"/><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div></div><p class="kg-product-card-description">This product is ok</p></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect(nodes.length).toBe(1);

            const productNode = nodes[0] as ProductNode;
            expect($isProductNode(productNode)).toBe(true);

            expect(productNode.productImageSrc).toBe('https://example.com/images/ok.jpg');
            expect(productNode.productTitle).toBe('Product title!');
            expect(productNode.productDescription).toBe('This product is ok');
            expect(productNode.productRatingEnabled).toBe(false);
            expect(productNode.productButtonEnabled).toBe(false);
            expect(productNode.productImageWidth!).toBe(200);
            expect(productNode.productImageHeight!).toBe(100);
        }));

        it('ignores malformed image width/height', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><img src="https://example.com/images/ok.jpg" class="kg-product-card-image" width="wide" height="tall"/><div class="kg-product-card-header"><div class="kg-product-card-title-container"><h4 class="kg-product-card-title">Product title!</h4></div></div><p class="kg-product-card-description">This product is ok</p></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect(nodes.length).toBe(1);

            const productNode = nodes[0] as ProductNode;
            expect($isProductNode(productNode)).toBe(true);

            expect(productNode.productImageSrc).toBe('https://example.com/images/ok.jpg');
            expect(productNode.productImageWidth).toBe(null);
            expect(productNode.productImageHeight).toBe(null);
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
            expect(nodes.length).toBe(1);

            const productNode = nodes[0] as ProductNode;
            expect($isProductNode(productNode)).toBe(true);

            expect(productNode.productImageSrc).toBe('https://example.com/images/ok.jpg');
            expect(productNode.productTitle).toBe('Product title!');
            expect(productNode.productDescription).toBe('This product is ok');
            expect(productNode.productRatingEnabled).toBe(false);
            expect(productNode.productButtonEnabled).toBe(true);
            expect(productNode.productButton).toBe('Click me');
            expect(productNode.productUrl).toBe('https://example.com/product/ok');
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
            expect(nodes.length).toBe(1);

            const productNode = nodes[0] as ProductNode;
            expect($isProductNode(productNode)).toBe(true);

            expect(productNode.productImageSrc).toBe('https://example.com/images/ok.jpg');
            expect(productNode.productTitle).toBe('Product title!');
            expect(productNode.productDescription).toBe('This product is ok');
            expect(productNode.productRatingEnabled).toBe(false);
            expect(productNode.productButtonEnabled).toBe(true);
            expect(productNode.productButton).toBe('Click me');
            expect(productNode.productUrl).toBe('#/portal/signup');
        }));

        it('falls through if title, description, button and image are missing', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-product-card"><div class="kg-product-card-container"><div class="kg-product-card-header"><div class="kg-product-card-title-container"></div><div class="kg-product-card-rating"><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class="kg-product-card-rating-active kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span><span class=" kg-product-card-rating-star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg></span></div></div></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect($isProductNode(nodes[0])).toBe(false);
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createProductNode();
            expect(node.getTextContent()).toBe('');

            node.productTitle = 'Product title!';
            expect(node.getTextContent()).toBe('Product title!\n\n');

            node.productDescription = 'This product is ok';
            expect(node.getTextContent()).toBe('Product title!\nThis product is ok\n\n');
        }));
    });
});
