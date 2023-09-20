const {html} = require('../utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {CollectionNode, $createCollectionNode, $isCollectionNode} = require('../../');

const editorNodes = [CollectionNode];

describe('CollectionNode', function () {
    let editor;
    let dataset;
    let exportOptions;

    const postData = [
        {
            title: 'The Secret Life of Kittens: Uncovering Their Mischievous Master Plans',
            id: 1,
            url: 'https://www.google.com',
            published_at: '2023-07-08T16:26:13.846-05:00',
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/230/250',
            reading_time: 3,
            author: 'Author McAuthory'
        },
        {
            title: 'Kittens Gone Wild: Epic Adventures of Feline Daredevils',
            id: 2,
            url: 'https://www.google.com',
            published_at: '2023-08-17T16:26:13.858-05:00',
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/251/250',
            reading_time: 5,
            author: 'Writer Writterson'
        },
        {
            title: 'The Kitten Olympics: Hilarious Competitions and Paw-some Winners',
            id: 3,
            url: 'https://www.google.com',
            published_at: '2023-09-11T16:26:13.858-05:00',
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/249/251',
            reading_time: 9,
            author: 'Author McAuthory'
        }
    ];

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
            columns: 1,
            header: 'Featured Posts'
        };

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            },
            renderData: new Map()
        };
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
            collectionNode.header.should.equal(dataset.header);
        }));

        it ('has setters for all properties', editorTest(function () {
            const node = $createCollectionNode(dataset);
            node.collection = 'latest';
            node.collection.should.deepEqual('latest');
            node.postCount = 5;
            node.postCount.should.equal(5);
            node.layout = 'grid';
            node.layout.should.equal('grid');
            node.columns = 2;
            node.columns.should.equal(2);
            node.header = 'Latest';
            node.header.should.equal('Latest');
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

    describe('exportDOM', function () {
        // because the renderer requires outside data, we need to mock it
        //  we can't mock the endpoint because that is called by the renderer, not exportDOM
        it('can render to HTML', editorTest(function () {
            const collectionNode = $createCollectionNode(dataset);
            const nodeKey = collectionNode.getKey();
            const renderData = new Map();
            renderData.set(nodeKey, postData);
            exportOptions.renderData = renderData;
            const {element} = collectionNode.exportDOM(exportOptions);
            const expectedElement = html`
                <div class="kg-card kg-collection-card kg-width-wide" data-kg-collection-slug="featured" data-kg-collection-limit="3">
                    <h4 class="kg-collection-card-title">Featured Posts</h4>
                    <div class="kg-collection-card-feed kg-collection-card-list">
                        <a href="https://www.google.com" class="kg-collection-card-post-wrapper">
                            <div class="kg-collection-card-post">
                                <div class="kg-collection-card-img">
                                    <img class="aspect-[3/2]" src="https://placekitten.com/230/250" alt="The Secret Life of Kittens: Uncovering Their Mischievous Master Plans">
                                </div>
                                <div class="kg-collection-card-content">
                                    <h2 class="kg-collection-card-post-title">The Secret Life of Kittens: Uncovering Their Mischievous Master Plans</h2>
                                    <p class="kg-collection-card-post-excerpt">Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet</p>
                                    <div class="kg-collection-card-post-meta">
                                        <p>8 Jul 2023</p>
                                        <p>&nbsp;· 3 min</p>
                                    </div>
                                </div>
                            </div>
                        </a>
                        <a href="https://www.google.com" class="kg-collection-card-post-wrapper">
                            <div class="kg-collection-card-post">
                                <div class="kg-collection-card-img">
                                    <img class="aspect-[3/2]" src="https://placekitten.com/251/250" alt="Kittens Gone Wild: Epic Adventures of Feline Daredevils">
                                </div>
                                <div class="kg-collection-card-content">
                                    <h2 class="kg-collection-card-post-title">Kittens Gone Wild: Epic Adventures of Feline Daredevils</h2>
                                    <p class="kg-collection-card-post-excerpt">Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet</p>
                                    <div class="kg-collection-card-post-meta">
                                        <p>17 Aug 2023</p>
                                        <p>&nbsp;· 5 min</p>
                                    </div>
                               </div>
                           </div>
                        </a>
                        <a href="https://www.google.com" class="kg-collection-card-post-wrapper">
                            <div class="kg-collection-card-post">
                                <div class="kg-collection-card-img">
                                    <img class="aspect-[3/2]" src="https://placekitten.com/249/251" alt="The Kitten Olympics: Hilarious Competitions and Paw-some Winners">
                                </div>
                                <div class="kg-collection-card-content">
                                    <h2 class="kg-collection-card-post-title">The Kitten Olympics: Hilarious Competitions and Paw-some Winners</h2>
                                    <p class="kg-collection-card-post-excerpt">Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet</p>
                                    <div class="kg-collection-card-post-meta">
                                        <p>11 Sep 2023</p>
                                        <p>&nbsp;· 9 min</p>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>
            `;
            element.outerHTML.should.prettifyTo(expectedElement);
        }));
    });
    
    describe('importDOM', function () {
        it('parses a collection card', editorTest(function () {
            const htmlstring = `
                <div class="kg-card kg-collection-card kg-width-wide" data-kg-collection-slug="latest" data-kg-collection-limit="3">
                    <h4 class="kg-collection-card-title"><span style="white-space: pre-wrap;">Latest</span></h4>
                    <div class="kg-collection-card-feed kg-collection-card-grid columns-3">
                        <a href="https://www.google.com" class="kg-collection-card-post-wrapper">
                            <div class="kg-collection-card-post">
                                <div class="kg-collection-card-img">
                                    <img class="aspect-[3/2]" src="https://placekitten.com/230/250" alt="The Secret Life of Kittens: Uncovering Their Mischievous Master Plans">
                                </div>
                                <div class="kg-collection-card-content">
                                    <h2 class="kg-collection-card-post-title">The Secret Life of Kittens: Uncovering Their Mischievous Master Plans</h2>
                                    <p class="kg-collection-card-post-excerpt">Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet</p>
                                    <div class="kg-collection-card-post-meta">
                                        <p>8 Sep 2023</p>
                                    </div>
                                </div>
                            </div>
                        </a>
                        <a href="https://www.google.com" class="kg-collection-card-post-wrapper">
                            <div class="kg-collection-card-post">
                                <div class="kg-collection-card-img">
                                    <img class="aspect-[3/2]" src="https://placekitten.com/251/250" alt="Kittens Gone Wild: Epic Adventures of Feline Daredevils">
                                </div>
                                <div class="kg-collection-card-content">
                                    <h2 class="kg-collection-card-post-title">Kittens Gone Wild: Epic Adventures of Feline Daredevils</h2>
                                    <p class="kg-collection-card-post-excerpt">Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet</p>
                                    <div class="kg-collection-card-post-meta">
                                        <p>9 Jun 2023</p>
                                        <p>&nbsp;· 2 min</p>
                                    </div>
                               </div>
                           </div>
                        </a>
                        <a href="https://www.google.com" class="kg-collection-card-post-wrapper">
                            <div class="kg-collection-card-post">
                                <div class="kg-collection-card-img">
                                    <img class="aspect-[3/2]" src="https://placekitten.com/249/251" alt="The Kitten Olympics: Hilarious Competitions and Paw-some Winners">
                                </div>
                                <div class="kg-collection-card-content">
                                    <h2 class="kg-collection-card-post-title">The Kitten Olympics: Hilarious Competitions and Paw-some Winners</h2>
                                    <p class="kg-collection-card-post-excerpt">Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet</p>
                                    <div class="kg-collection-card-post-meta">
                                        <p>17 Aug 2023</p>
                                        <p>&nbsp;· 8 min</p>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>
            `;
            const dom = new JSDOM(htmlstring).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            const node = nodes[0];
            node.collection.should.equal('latest');
            node.layout.should.equal('grid');
            node.postCount.should.equal(3);
            node.columns.should.equal(3);
            node.header.should.equal('Latest');
        }));
    });
});