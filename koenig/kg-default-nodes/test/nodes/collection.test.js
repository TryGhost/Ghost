// const {html} = require('../utils');
const {createHeadlessEditor} = require('@lexical/headless');
// const {$generateNodesFromDOM} = require('@lexical/html');
// const {JSDOM} = require('jsdom');
const {CollectionNode, $createCollectionNode, $isCollectionNode} = require('../../');

const editorNodes = [CollectionNode];

describe('CollectionNode', function () {
    let editor;
    let dataset;
    // let exportOptions;

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

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            collection: 'featured',
            postCount: 3,
            layout: 'list',
            columns: 1
        };

        // exportOptions = {
        //     createDocument() {
        //         return (new JSDOM()).window.document;
        //     }
        // };
    });

    it('matches node with $isCollectionNode', editorTest(function () {
        const collectionNode = $createCollectionNode(dataset);
        $isCollectionNode(collectionNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const collectionNode = $createCollectionNode(dataset);
            collectionNode.collection.should.equal(dataset.collection);
            collectionNode.postCount.should.equal(dataset.postCount);
            collectionNode.layout.should.equal(dataset.layout);
            collectionNode.columns.should.equal(dataset.columns);
        }));

        it ('has setters for all properties', editorTest(function () {
            const node = $createCollectionNode(dataset);
            node.collection = {title: 'latest', id: 123456};
            node.collection.should.deepEqual({title: 'latest', id: 123456});
            node.postCount = 5;
            node.postCount.should.equal(5);
            node.layout = 'grid';
            node.layout.should.equal('grid');
            node.columns = 2;
            node.columns.should.equal(2);
        }));

        it('has getDataset() method', editorTest(function () {
            const collectionNode = $createCollectionNode(dataset);
            const nodeData = collectionNode.getDataset();
            nodeData.should.deepEqual(dataset);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            CollectionNode.getType().should.equal('collection');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const collectionNode = $createCollectionNode(dataset);
            const collectionNodeDataset = collectionNode.getDataset();
            const clone = CollectionNode.clone(collectionNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...collectionNodeDataset});
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const collectionNode = $createCollectionNode(dataset);
            collectionNode.hasEditMode().should.be.true;
        }));
    });

    // describe('exportDOM', function () {
    //     it('can render to HTML', editorTest(function () {
    //         const collectionNode = $createCollectionNode(dataset);
    //         const {element} = collectionNode.exportDOM(exportOptions);
    //         const expectedElement = html`
    //             <div class="kg-card kg-collection-card kg-width-full kg-size-small kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
    //                 <h2 class="kg-collection-card-collection" id="this-is-the-collection-card">This is the collection card</h2>
    //                 <h3 class="kg-collection-card-subcollection" id="hello">hello</h3>
    //                 <a class="kg-collection-card-button" href="https://example.com/">The button</a>
    //             </div>
    //     `;
    //         element.outerHTML.should.prettifyTo(expectedElement);
    //     }));

    //     it('renders nothing when collection and subcollection is undefined and the button is disabled', editorTest(function () {
    //         const node = $createCollectionNode(dataset);
    //         node.collection = null;
    //         node.subcollection = null;
    //         node.buttonEnabled = false;
    //         const {element} = node.exportDOM(exportOptions);
    //         element.should.be.null;
    //     }));

    //     it('renders a minimal collection card', editorTest(function () {
    //         let payload = {
    //             backgroundImageSrc: '',
    //             buttonEnabled: false,
    //             buttonText: 'The button',
    //             buttonUrl: 'https://example.com/',
    //             collection: 'hello world',
    //             size: 'small',
    //             style: 'dark',
    //             subcollection: 'hello sub world'
    //         };
    //         const node = $createCollectionNode(payload);

    //         const {element} = node.exportDOM(exportOptions);
    //         const expectedElement = `<div class="kg-card kg-collection-card kg-width-full kg-size-small kg-style-dark" data-kg-background-image="" style=""><h2 class="kg-collection-card-collection" id="hello-world">hello world</h2><h3 class="kg-collection-card-subcollection" id="hello-sub-world">hello sub world</h3></div>`;
    //         element.outerHTML.should.equal(expectedElement);
    //     }));

    //     it('renders without subcollection', editorTest(function () {
    //         let payload = {
    //             backgroundImageSrc: '',
    //             buttonEnabled: false,
    //             buttonText: 'The button',
    //             buttonUrl: 'https://example.com/',
    //             collection: 'hello world',
    //             size: 'small',
    //             style: 'dark',
    //             subcollection: ''
    //         };
    //         const node = $createCollectionNode(payload);

    //         const {element} = node.exportDOM(exportOptions);
    //         const expectedElement = `<div class="kg-card kg-collection-card kg-width-full kg-size-small kg-style-dark" data-kg-background-image="" style=""><h2 class="kg-collection-card-collection" id="hello-world">hello world</h2></div>`;
    //         element.outerHTML.should.equal(expectedElement);
    //     }));
    // });
    // describe('importDOM', function () {
    //     it('parses a collection card', editorTest(function () {
    //         const htmlstring = `
    //         <div class="kg-card kg-collection-card kg-size-large kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
    //             <h2 class="kg-collection-card-collection" id="collection-slug">Collection</h2>
    //             <h3 class="kg-collection-card-subcollection" id="subcollection-slug">Subcollection</h3>
    //             <a class="kg-collection-card-button" href="https://example.com">Button</a>
    //         </div>`;
    //         const dom = new JSDOM(htmlstring).window.document;
    //         const nodes = $generateNodesFromDOM(editor, dom);
    //         nodes.length.should.equal(1);
    //         const node = nodes[0];
    //         node.size.should.equal('large');
    //         node.style.should.equal('image');
    //         node.backgroundImageSrc.should.equal('https://example.com/image.jpg');
    //         node.collection.should.equal('Collection');
    //         node.subcollection.should.equal('Subcollection');
    //         node.buttonEnabled.should.be.true;
    //         node.buttonUrl.should.equal('https://example.com');
    //         node.buttonText.should.equal('Button');
    //     }));
    // });
});
