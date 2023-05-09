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

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            headerNode.hasEditMode().should.be.true;
        }));
    });

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            headerNode.getSize().should.equal(dataset.size);
            headerNode.getStyle().should.equal(dataset.style);
            headerNode.getBackgroundImageSrc().should.equal(dataset.backgroundImageSrc);
            headerNode.getHeader().should.equal(dataset.header);
            headerNode.getSubheader().should.equal(dataset.subheader);
            headerNode.getButtonEnabled().should.equal(dataset.buttonEnabled);
            headerNode.getButtonText().should.equal(dataset.buttonText);
            headerNode.getButtonUrl().should.equal(dataset.buttonUrl);
        }));

        it ('has setters for all properties', editorTest(function () {
            const node = $createHeaderNode(dataset);
            node.setSize('large');
            node.getSize().should.equal('large');
            node.setStyle('light');
            node.getStyle().should.equal('light');
            node.setBackgroundImageSrc('https://example.com/image2.jpg');
            node.getBackgroundImageSrc().should.equal('https://example.com/image2.jpg');
            node.setHeader('This is the new header');
            node.getHeader().should.equal('This is the new header');
            node.setSubheader('This is the new subheader');
            node.getSubheader().should.equal('This is the new subheader');
            node.setButtonEnabled(false);
            node.getButtonEnabled().should.equal(false);
            node.setButtonText('This is the new button text');
            node.getButtonText().should.equal('This is the new button text');
            node.setButtonUrl('https://example.com/newurl');
            node.getButtonUrl().should.equal('https://example.com/newurl');
        }));

        it('has getDataset() method', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            const nodeData = headerNode.getDataset();
            nodeData.should.deepEqual(dataset);
        }));
    });

    describe('exporting', function () {
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
            node.setHeader(null);
            node.setSubheader(null);
            node.setButtonEnabled(false);
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
            node.getSize().should.equal('large');
            node.getStyle().should.equal('image');
            node.getBackgroundImageSrc().should.equal('https://example.com/image.jpg');
            node.getHeader().should.equal('Header');
            node.getSubheader().should.equal('Subheader');
            node.getButtonEnabled().should.be.true;
            node.getButtonUrl().should.equal('https://example.com');
            node.getButtonText().should.equal('Button');
        }));
    });
});
