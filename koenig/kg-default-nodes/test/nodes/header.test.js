const {html} = require('../utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {HeaderNode, $createHeaderNode, $isHeaderNode} = require('../../');

const editorNodes = [HeaderNode];

describe('HeaderNode', function () {
    let editor;
    let dataset;
    let exportOptions;

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
            backgroundImageSrc: 'https://example.com/image.jpg',
            buttonEnabled: true,
            buttonText: 'The button',
            buttonUrl: 'https://example.com/',
            header: 'This is the header card',
            size: 'small',
            style: 'image',
            subheader: 'hello'
        };

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isHeaderNode', editorTest(function () {
        const headerNode = $createHeaderNode(dataset);
        $isHeaderNode(headerNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            headerNode.size.should.equal(dataset.size);
            headerNode.style.should.equal(dataset.style);
            headerNode.backgroundImageSrc.should.equal(dataset.backgroundImageSrc);
            headerNode.header.should.equal(dataset.header);
            headerNode.subheader.should.equal(dataset.subheader);
            headerNode.buttonEnabled.should.equal(dataset.buttonEnabled);
            headerNode.buttonText.should.equal(dataset.buttonText);
            headerNode.buttonUrl.should.equal(dataset.buttonUrl);
        }));

        it ('has setters for all properties', editorTest(function () {
            const node = $createHeaderNode(dataset);
            node.size = 'large';
            node.size.should.equal('large');
            node.style = 'light';
            node.style.should.equal('light');
            node.backgroundImageSrc = 'https://example.com/image2.jpg';
            node.backgroundImageSrc.should.equal('https://example.com/image2.jpg');
            node.header = 'This is the new header';
            node.header.should.equal('This is the new header');
            node.subheader = 'This is the new subheader';
            node.subheader.should.equal('This is the new subheader');
            node.buttonEnabled = false;
            node.buttonEnabled.should.equal(false);
            node.buttonText = 'This is the new button text';
            node.buttonText.should.equal('This is the new button text');
            node.buttonUrl = 'https://example.com/newurl';
            node.buttonUrl.should.equal('https://example.com/newurl');
        }));

        it('has getDataset() method', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            const nodeData = headerNode.getDataset();
            nodeData.should.deepEqual(dataset);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            HeaderNode.getType().should.equal('header');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            const headerNodeDataset = headerNode.getDataset();
            const clone = HeaderNode.clone(headerNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...headerNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            HeaderNode.urlTransformMap.should.deepEqual({
                buttonUrl: 'url',
                backgroundImageSrc: 'url',
                header: 'html',
                subheader: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            headerNode.hasEditMode().should.be.true;
        }));
    });

    describe('exportDOM', function () {
        it('can render to HTML', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            const {element} = headerNode.exportDOM(exportOptions);
            const expectedElement = html`
                <div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
                    <h2 class="kg-header-card-header" id="this-is-the-header-card">This is the header card</h2>
                    <h3 class="kg-header-card-subheader" id="hello">hello</h3>
                    <a class="kg-header-card-button" href="https://example.com/">The button</a>
                </div>
        `;
            element.outerHTML.should.prettifyTo(expectedElement);
        }));

        it('renders nothing when header and subheader is undefined and the button is disabled', editorTest(function () {
            const node = $createHeaderNode(dataset);
            node.header = null;
            node.subheader = null;
            node.buttonEnabled = false;
            const {element} = node.exportDOM(exportOptions);
            element.should.be.null;
        }));

        it('renders a minimal header card', editorTest(function () {
            let payload = {
                backgroundImageSrc: '',
                buttonEnabled: false,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                header: 'hello world',
                size: 'small',
                style: 'dark',
                subheader: 'hello sub world'
            };
            const node = $createHeaderNode(payload);

            const {element} = node.exportDOM(exportOptions);
            const expectedElement = `<div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-dark" data-kg-background-image="" style=""><h2 class="kg-header-card-header" id="hello-world">hello world</h2><h3 class="kg-header-card-subheader" id="hello-sub-world">hello sub world</h3></div>`;
            element.outerHTML.should.equal(expectedElement);
        }));

        it('renders without subheader', editorTest(function () {
            let payload = {
                backgroundImageSrc: '',
                buttonEnabled: false,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                header: 'hello world',
                size: 'small',
                style: 'dark',
                subheader: ''
            };
            const node = $createHeaderNode(payload);

            const {element} = node.exportDOM(exportOptions);
            const expectedElement = `<div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-dark" data-kg-background-image="" style=""><h2 class="kg-header-card-header" id="hello-world">hello world</h2></div>`;
            element.outerHTML.should.equal(expectedElement);
        }));
    });
    describe('importDOM', function () {
        it('parses a header card', editorTest(function () {
            const htmlstring = `
            <div class="kg-card kg-header-card kg-size-large kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
                <h2 class="kg-header-card-header" id="header-slug">Header</h2>
                <h3 class="kg-header-card-subheader" id="subheader-slug">Subheader</h3>
                <a class="kg-header-card-button" href="https://example.com">Button</a>
            </div>`;
            const dom = new JSDOM(htmlstring).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            const node = nodes[0];
            node.size.should.equal('large');
            node.style.should.equal('image');
            node.backgroundImageSrc.should.equal('https://example.com/image.jpg');
            node.header.should.equal('Header');
            node.subheader.should.equal('Subheader');
            node.buttonEnabled.should.be.true;
            node.buttonUrl.should.equal('https://example.com');
            node.buttonText.should.equal('Button');
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createHeaderNode();
            node.getTextContent().should.equal('');

            node.header = 'Test';
            node.getTextContent().should.equal('Test\n\n');

            node.subheader = 'Subheader';
            node.getTextContent().should.equal('Test\nSubheader\n\n');
        }));
    });
});
