import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {HeaderNode, $createHeaderNode, $isHeaderNode} from '../../src/index.js';
import _ from 'lodash';
import type {LexicalEditor} from 'lexical';

const editorNodes = [HeaderNode];

describe('HeaderNode', function () {
    describe('v1', function () {
        let editor: LexicalEditor;
        let dataset: Record<string, unknown>;
        let exportOptions: Record<string, unknown>;

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
            expect($isHeaderNode(headerNode)).toBe(true);
        }));

        describe('data access', function () {
            it('has getters for all properties', editorTest(function () {
                const headerNode = $createHeaderNode(dataset);
                expect(headerNode.size).toBe(dataset.size);
                expect(headerNode.style).toBe(dataset.style);
                expect(headerNode.backgroundImageSrc).toBe(dataset.backgroundImageSrc);
                expect(headerNode.header).toBe(dataset.header);
                expect(headerNode.subheader).toBe(dataset.subheader);
                expect(headerNode.buttonEnabled).toBe(dataset.buttonEnabled);
                expect(headerNode.buttonText).toBe(dataset.buttonText);
                expect(headerNode.buttonUrl).toBe(dataset.buttonUrl);
            }));

            it ('has setters for all properties', editorTest(function () {
                const node = $createHeaderNode(dataset);
                node.size = 'large';
                expect(node.size).toBe('large');
                node.style = 'light';
                expect(node.style).toBe('light');
                node.backgroundImageSrc = 'https://example.com/image2.jpg';
                expect(node.backgroundImageSrc).toBe('https://example.com/image2.jpg');
                node.header = 'This is the new header';
                expect(node.header).toBe('This is the new header');
                node.subheader = 'This is the new subheader';
                expect(node.subheader).toBe('This is the new subheader');
                node.buttonEnabled = false;
                expect(node.buttonEnabled).toBe(false);
                node.buttonText = 'This is the new button text';
                expect(node.buttonText).toBe('This is the new button text');
                node.buttonUrl = 'https://example.com/newurl';
                expect(node.buttonUrl).toBe('https://example.com/newurl');
            }));

            it('has getDataset() method', editorTest(function () {
                const headerNode = $createHeaderNode(dataset);
                const nodeData = headerNode.getDataset();
                // check that all v1 properties are present for backwards compatibility
                expect(nodeData).toHaveProperty('version', 1);
                expect(nodeData).toHaveProperty('backgroundImageSrc', 'https://example.com/image.jpg');
                expect(nodeData).toHaveProperty('buttonEnabled', true);
                expect(nodeData).toHaveProperty('buttonText', 'The button');
                expect(nodeData).toHaveProperty('buttonUrl', 'https://example.com/');
                expect(nodeData).toHaveProperty('header', 'This is the header card');
                expect(nodeData).toHaveProperty('size', 'small');
                expect(nodeData).toHaveProperty('style', 'image');
                expect(nodeData).toHaveProperty('subheader', 'hello');
            }));
        });

        describe('getType', function () {
            it('returns the correct node type', editorTest(function () {
                expect(HeaderNode.getType()).toBe('header');
            }));
        });

        describe('clone', function () {
            it('returns a copy of the current node', editorTest(function () {
                const headerNode = $createHeaderNode(dataset);
                const headerNodeDataset = headerNode.getDataset();
                const clone = HeaderNode.clone(headerNode) as HeaderNode;
                const cloneDataset = clone.getDataset();

                expect(cloneDataset).toEqual({...headerNodeDataset});
            }));
        });

        describe('urlTransformMap', function () {
            it('contains the expected URL mapping', editorTest(function () {
                expect(HeaderNode.urlTransformMap).toEqual({
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
                expect(headerNode.hasEditMode()).toBe(true);
            }));
        });

        describe('exportDOM', function () {
            it('can render to HTML', editorTest(function () {
                const headerNode = $createHeaderNode(dataset);
                const result = headerNode.exportDOM(editor, exportOptions);
                const expectedElement = html`
                <div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
                    <h2 class="kg-header-card-header" id="this-is-the-header-card">This is the header card</h2>
                    <h3 class="kg-header-card-subheader" id="hello">hello</h3>
                    <a class="kg-header-card-button" href="https://example.com/">The button</a>
                </div>
        `;
                expect((result as unknown as {type?: string}).type).toBe('inner');
                assertPrettifiesTo((result.element as HTMLElement).innerHTML, expectedElement);
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
                const nodes = $generateNodesFromDOM(editor, document) as HeaderNode[];
                expect(nodes.length).toBe(1);
                const node = nodes[0];
                expect(node.size).toBe('large');
                expect(node.style).toBe('image');
                expect(node.backgroundImageSrc).toBe('https://example.com/image.jpg');
                expect(node.header).toBe('Header');
                expect(node.subheader).toBe('Subheader');
                expect(node.buttonEnabled).toBe(true);
                expect(node.buttonUrl).toBe('https://example.com');
                expect(node.buttonText).toBe('Button');
            }));

            it('does not parse a v2 header as v1', editorTest(function () {
                const htmlstring = `
            <div class="kg-card kg-header-card kg-v2 kg-size-large kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
                <h2 class="kg-header-card-header" id="header-slug">Header</h2>
                <h3 class="kg-header-card-subheader" id="subheader-slug">Subheader</h3>
                <a class="kg-header-card-button" href="https://example.com">Button</a>
            </div>`;

                const document = createDocument(htmlstring);
                const nodes = $generateNodesFromDOM(editor, document) as HeaderNode[];
                expect(nodes.length).toBe(1);
                const node = nodes[0];
                expect(node.version).toBe(2);
            }));
        });

        describe('getTextContent', function () {
            it('returns contents', editorTest(function () {
                const node = $createHeaderNode();
                expect(node.getTextContent()).toBe('');

                node.header = 'Test';
                expect(node.getTextContent()).toBe('Test\n\n');

                node.subheader = 'Subheader';
                expect(node.getTextContent()).toBe('Test\nSubheader\n\n');
            }));
        });
    });

    describe('v2', function () {
        let editor: LexicalEditor;
        let dataset: Record<string, unknown>;
        let exportOptions: Record<string, unknown>;

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
            expect($isHeaderNode(headerNode)).toBe(true);
        }));

        describe('data access', function () {
            it('has getters for all properties', editorTest(function () {
                const node = $createHeaderNode(dataset);
                expect(node.version).toBe(2);
                expect(node.backgroundImageSrc).toBe('https://example.com/image.jpg');
                expect(node.buttonEnabled).toBe(true);
                expect(node.buttonText).toBe('The button');
                expect(node.buttonUrl).toBe('https://example.com/');
                expect(node.header).toBe('This is the header card');
                expect(node.subheader).toBe('hello');
                expect(node.alignment).toBe('center');
                expect(node.backgroundColor).toBe('#F0F0F0');
                expect(node.backgroundSize).toBe('cover');
                expect(node.textColor).toBe('#000000');
                expect(node.buttonColor).toBe('#000000');
                expect(node.buttonTextColor).toBe('#FFFFFF');
                expect(node.layout).toBe('full');
                expect(node.swapped).toBe(false);
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

                expect(node.backgroundImageSrc).toBe('https://example.com/image2.jpg');
                expect(node.buttonEnabled).toBe(false);
                expect(node.buttonText).toBe('The button 2');
                expect(node.buttonUrl).toBe('https://example.com/2');
                expect(node.header).toBe('This is the header card 2');
                expect(node.subheader).toBe('hello 2');
                expect(node.alignment).toBe('left');
                expect(node.backgroundColor).toBe('#F0F0F1');
                expect(node.backgroundSize).toBe('contain');
                expect(node.textColor).toBe('#000001');
                expect(node.buttonColor).toBe('#000001');
                expect(node.buttonTextColor).toBe('#FFFFFF');
                expect(node.layout).toBe('full');
                expect(node.swapped).toBe(true);
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
                const nodes = $generateNodesFromDOM(editor, document) as HeaderNode[];
                expect(nodes.length).toBe(1);
                const node = nodes[0];
                expect(node.backgroundColor).toBe('accent');
                expect(node.buttonColor).toBe('#abcdef');
                expect(node.alignment).toBe('center');
                expect(node.backgroundImageSrc).toBe('https://example.com/image.jpg');
                expect(node.layout).toBe('split');
                expect(node.textColor).toBe('#abcdef');
                expect(node.header).toBe('Header');
                expect(node.subheader).toBe('Subheader');
                expect(node.buttonEnabled).toBe(true);
                expect(node.buttonUrl).toBe('https://example.com');
                expect(node.buttonText).toBe('Button');
                expect(node.buttonTextColor).toBe('#abcdef');
            }));

            it('does not parse a v1 header as v2', editorTest(function () {
                const htmlstring = `
            <div class="kg-card kg-header-card kg-size-large kg-style-image" data-kg-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
                <h2 class="kg-header-card-header" id="header-slug">Header</h2>
                <h3 class="kg-header-card-subheader" id="subheader-slug">Subheader</h3>
                <a class="kg-header-card-button" href="https://example.com">Button</a>
            </div>`;

                const document = createDocument(htmlstring);
                const nodes = $generateNodesFromDOM(editor, document) as HeaderNode[];
                expect(nodes.length).toBe(1);
                const node = nodes[0];
                expect(node.version).toBe(1);
            }));
        });

        describe('getType', function () {
            it('returns correct node type', editorTest(function () {
                const node = $createHeaderNode(dataset);
                expect(node.getType()).toBe('header');
            }));
        });

        describe('clone', function () {
            it('returns a copy of the current node', editorTest(function () {
                const headerNode = $createHeaderNode(dataset);
                const headerNodeDataset = headerNode.getDataset();
                const clone = HeaderNode.clone(headerNode) as HeaderNode;
                const cloneDataset = clone.getDataset();
                expect(cloneDataset).toEqual({...headerNodeDataset});
            }));
        });

        describe('urlTransformMap', function () {
            it('contains the expected URL mapping', editorTest(function () {
                expect(HeaderNode.urlTransformMap).toEqual({
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
                expect(headerNode.hasEditMode()).toBe(true);
            }));
        });

        describe('exportDOM', function () {
            it('renders version 2 html', editorTest(function () {
                const headerNode = $createHeaderNode(dataset);
                const {element} = headerNode.exportDOM(editor, exportOptions);
                const el = element as HTMLElement;

                // Assuming outerHTML gets the full HTML string of the element
                const renderedHtml = _.replace(el.outerHTML, /\s/g, '');
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
                expect(renderedHtml).toBe(cleanedExpectedHtml);
            }));
        });
    });
});
