const {createDocument, dom, html} = require('../test-utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {HeaderNode, $createHeaderNode, $isHeaderNode} = require('../../');
const {_} = require('lodash');

const editorNodes = [HeaderNode];

describe('HeaderNode', function () {
    describe('v1', function () {
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
                version: 1,
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
                dom
            };
        });

        it('matches node with $isHeaderNode', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            $isHeaderNode(headerNode).should.be.true();
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
                // check that all v1 properties are present for backwards compatibility
                nodeData.should.have.property('version', 1);
                nodeData.should.have.property('backgroundImageSrc', 'https://example.com/image.jpg');
                nodeData.should.have.property('buttonEnabled', true);
                nodeData.should.have.property('buttonText', 'The button');
                nodeData.should.have.property('buttonUrl', 'https://example.com/');
                nodeData.should.have.property('header', 'This is the header card');
                nodeData.should.have.property('size', 'small');
                nodeData.should.have.property('style', 'image');
                nodeData.should.have.property('subheader', 'hello');
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
                headerNode.hasEditMode().should.be.true();
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
                    version: 1,
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
                    version: 1,
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
                const document = createDocument(htmlstring);
                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.equal(1);
                const node = nodes[0];
                node.size.should.equal('large');
                node.style.should.equal('image');
                node.backgroundImageSrc.should.equal('https://example.com/image.jpg');
                node.header.should.equal('Header');
                node.subheader.should.equal('Subheader');
                node.buttonEnabled.should.be.true();
                node.buttonUrl.should.equal('https://example.com');
                node.buttonText.should.equal('Button');
            }));

            it('does not parse a v2 header as v1', editorTest(function () {
                const htmlstring = `
            <div class="kg-card kg-header-card kg-v2 kg-size-large kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
                <h2 class="kg-header-card-header" id="header-slug">Header</h2>
                <h3 class="kg-header-card-subheader" id="subheader-slug">Subheader</h3>
                <a class="kg-header-card-button" href="https://example.com">Button</a>
            </div>`;

                const document = createDocument(htmlstring);
                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.equal(1);
                const node = nodes[0];
                node.version.should.equal(2);
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

    describe('v2', function () {
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
                version: 2,
                backgroundImageSrc: 'https://example.com/image.jpg',
                buttonEnabled: true,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                header: 'This is the header card',
                subheader: 'hello',
                alignment: 'center',
                backgroundColor: '#F0F0F0',
                backgroundSize: 'cover',
                textColor: '#000000',
                buttonColor: '#000000',
                buttonTextColor: '#FFFFFF',
                layout: 'full',
                swapped: false
            };

            exportOptions = {
                imageOptimization: {
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                },
                canTransformImage: () => true,
                dom
            };
        });

        it('matches node with $isHeaderNode', editorTest(function () {
            const headerNode = $createHeaderNode(dataset);
            $isHeaderNode(headerNode).should.be.true();
        }));

        describe('data access', function () {
            it('has getters for all properties', editorTest(function () {
                const node = $createHeaderNode(dataset);
                node.version.should.equal(2);
                node.backgroundImageSrc.should.equal('https://example.com/image.jpg');
                node.buttonEnabled.should.be.true();
                node.buttonText.should.equal('The button');
                node.buttonUrl.should.equal('https://example.com/');
                node.header.should.equal('This is the header card');
                node.subheader.should.equal('hello');
                node.alignment.should.equal('center');
                node.backgroundColor.should.equal('#F0F0F0');
                node.backgroundSize.should.equal('cover');
                node.textColor.should.equal('#000000');
                node.buttonColor.should.equal('#000000');
                node.buttonTextColor.should.equal('#FFFFFF');
                node.layout.should.equal('full');
                node.swapped.should.be.false();
            }));

            it('has setters for all properties', editorTest(function () {
                const node = $createHeaderNode(dataset);
                node.backgroundImageSrc = 'https://example.com/image2.jpg';
                node.buttonEnabled = false;
                node.buttonText = 'The button 2';
                node.buttonUrl = 'https://example.com/2';
                node.header = 'This is the header card 2';
                node.subheader = 'hello 2';
                node.alignment = 'left';
                node.backgroundColor = '#F0F0F1';
                node.backgroundSize = 'contain';
                node.textColor = '#000001';
                node.buttonColor = '#000001';
                node.buttonTextColor = '#FFFFFF';
                node.layout = 'full';
                node.swapped = true;

                node.backgroundImageSrc.should.equal('https://example.com/image2.jpg');
                node.buttonEnabled.should.be.false();
                node.buttonText.should.equal('The button 2');
                node.buttonUrl.should.equal('https://example.com/2');
                node.header.should.equal('This is the header card 2');
                node.subheader.should.equal('hello 2');
                node.alignment.should.equal('left');
                node.backgroundColor.should.equal('#F0F0F1');
                node.backgroundSize.should.equal('contain');
                node.textColor.should.equal('#000001');
                node.buttonColor.should.equal('#000001');
                node.buttonTextColor.should.equal('#FFFFFF');
                node.layout.should.equal('full');
                node.swapped.should.be.true();
            }));
        });

        describe('importDOM', function () {
            it('parses a header card V2', editorTest(function () {
                const htmlstring = `
                    <div class="kg-card kg-header-card kg-v2 kg-style-accent" data-background-color="#abcdef">
                        <picture><img class="kg-header-card-image" src="https://example.com/image.jpg" alt="" /></picture>
                        <div class="kg-header-card-content">
                            <div class="kg-header-card-text kg-align-center">
                                <h2 class="kg-header-card-heading" data-text-color="#abcdef">Header</h2>
                                <p class="kg-header-card-subheading" data-text-color="#abcdef">Subheader</p>
                                <a href="https://example.com" class="kg-header-card-button" data-button-color="#abcdef" data-button-text-color="#abcdef">Button</a>
                            </div>
                        </div>
                    </div>`;
                const document = createDocument(htmlstring);
                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.equal(1);
                const node = nodes[0];
                node.backgroundColor.should.equal('accent');
                node.buttonColor.should.equal('#abcdef');
                node.alignment.should.equal('center');
                node.backgroundImageSrc.should.equal('https://example.com/image.jpg');
                node.layout.should.equal('split');
                node.textColor.should.equal('#abcdef');
                node.header.should.equal('Header');
                node.subheader.should.equal('Subheader');
                node.buttonEnabled.should.be.true();
                node.buttonUrl.should.equal('https://example.com');
                node.buttonText.should.equal('Button');
                node.buttonTextColor.should.equal('#abcdef');
            }));

            it('does not parse a v1 header as v2', editorTest(function () {
                const htmlstring = `
            <div class="kg-card kg-header-card kg-size-large kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
                <h2 class="kg-header-card-header" id="header-slug">Header</h2>
                <h3 class="kg-header-card-subheader" id="subheader-slug">Subheader</h3>
                <a class="kg-header-card-button" href="https://example.com">Button</a>
            </div>`;

                const document = createDocument(htmlstring);
                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.equal(1);
                const node = nodes[0];
                node.version.should.equal(1);
            }));
        });

        describe('getType', function () {
            it('returns correct node type', editorTest(function () {
                const node = $createHeaderNode(dataset);
                node.getType().should.equal('header');
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
                headerNode.hasEditMode().should.be.true();
            }));
        });

        describe('exportDOM', function () {
            it('renders version 2 html', editorTest(function () {
                const headerNode = $createHeaderNode(dataset);
                const {element} = headerNode.exportDOM(exportOptions);

                // Assuming outerHTML gets the full HTML string of the element
                const renderedHtml = _.replace(element.outerHTML, /\s/g, '');
                const expectedHtml = `
                <div class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide " data-background-color="#F0F0F0">
                <picture><img class="kg-header-card-image" src="https://example.com/image.jpg" loading="lazy" alt=""></picture>
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                            <h2 id="this-is-the-header-card" class="kg-header-card-heading" style="color: #000000;" data-text-color="#000000">This is the header card</h2>
                            <p id="hello" class="kg-header-card-subheading" style="color: #000000;" data-text-color="#000000">hello</p>
                            <a href="https://example.com/" class="kg-header-card-button " style="background-color: #000000;color: #FFFFFF;" data-button-color="#000000" data-button-text-color="#FFFFFF">The button</a>
                        </div>
                    </div>
                </div>
                `;
                const cleanedExpectedHtml = _.replace(expectedHtml, /\s/g, '');
                renderedHtml.should.equal(cleanedExpectedHtml);
            }));

            it('renders nothing when header and subheader is undefined and the button is disabled', editorTest(function () {
                const node = $createHeaderNode(dataset);
                node.header = null;
                node.subheader = null;
                node.buttonEnabled = false;
                const {element} = node.exportDOM(exportOptions);
                element.should.be.null;
            }));

            it('renders without subheader', editorTest(function () {
                let payload = {
                    version: 2,
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
                const renderedHtml = _.replace(element.outerHTML, /\s/g, '');
                const expectedHtml = `
                <div class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide " style="background-color: #000000;" data-background-color="#000000">
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                        <h2 id="hello-world" class="kg-header-card-heading" style="color: #FFFFFF;" data-text-color="#FFFFFF">hello world</h2>
                        </div>
                    </div>
                </div>
                `;

                const cleanedExpectedHtml = _.replace(expectedHtml, /\s/g, '');
                renderedHtml.should.equal(cleanedExpectedHtml);
            }));

            it('renders with srcset', editorTest(function () {
                let payload = {
                    version: 2,
                    backgroundImageSrc: '/content/images/2022/11/koenig-lexical.jpg',
                    backgroundImageWidth: 3840,
                    backgroundImageHeight: 2160,
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
                const renderedHtml = _.replace(element.outerHTML, /\s/g, '');
                const expectedHtml = `
                <div class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide " data-background-color="#000000">
                    <picture><img class="kg-header-card-image" src="/content/images/2022/11/koenig-lexical.jpg" srcset="/content/images/size/w600/2022/11/koenig-lexical.jpg 600w, /content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w, /content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w, /content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w" loading="lazy" alt=""></picture>
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                        <h2 id="hello-world" class="kg-header-card-heading" style="color: #FFFFFF;" data-text-color="#FFFFFF">hello world</h2>
                        </div>
                    </div>
                </div>
                `;

                const cleanedExpectedHtml = _.replace(expectedHtml, /\s/g, '');
                renderedHtml.should.equal(cleanedExpectedHtml);
            }));
        });
    });
});
