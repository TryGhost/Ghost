import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {$getRoot} from 'lexical';
import type {LexicalEditor} from 'lexical';
import {dom, createDocument, html as htmlTemplate} from '../test-utils/index.js';
import {CallToActionNode, $createCallToActionNode, $isCallToActionNode, utils, type ExportDOMOutputType} from '../../src/index.js';
const editorNodes = [CallToActionNode];

describe('CallToActionNode', function () {
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

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});
        dataset = {
            layout: 'minimal',
            textValue: 'This is a cool advertisement',
            sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
            showButton: true,
            showDividers: true,
            buttonText: 'click me',
            buttonUrl: 'http://blog.com/post1',
            buttonColor: 'none',
            buttonTextColor: 'none',
            hasSponsorLabel: true,
            backgroundColor: 'none',
            imageUrl: 'http://blog.com/image1.jpg',
            imageWidth: 200,
            imageHeight: 100,
            linkColor: 'text'
        };
        exportOptions = {
            exportFormat: 'html',
            dom,
            feature: {},
            design: {}
        };
    });

    it('matches node with $isCallToActionNode', editorTest(function () {
        const callToActionNode = new CallToActionNode(dataset);
        expect($isCallToActionNode(callToActionNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);

            expect(callToActionNode.layout).toBe(dataset.layout);
            expect(callToActionNode.textValue).toBe(dataset.textValue);
            expect(callToActionNode.showButton).toBe(dataset.showButton);
            expect(callToActionNode.showDividers).toBe(dataset.showDividers);
            expect(callToActionNode.buttonText).toBe(dataset.buttonText);
            expect(callToActionNode.buttonUrl).toBe(dataset.buttonUrl);
            expect(callToActionNode.buttonColor).toBe(dataset.buttonColor);
            expect(callToActionNode.buttonTextColor).toBe(dataset.buttonTextColor);
            expect(callToActionNode.hasSponsorLabel).toBe(dataset.hasSponsorLabel);
            expect(callToActionNode.sponsorLabel).toBe(dataset.sponsorLabel);
            expect(callToActionNode.backgroundColor).toBe(dataset.backgroundColor);
            expect(callToActionNode.imageUrl!).toBe(dataset.imageUrl);
            expect(callToActionNode.visibility as Record<string, unknown>).toEqual(utils.visibility.buildDefaultVisibility());
            expect(callToActionNode.imageHeight!).toBe(dataset.imageHeight);
            expect(callToActionNode.imageWidth!).toBe(dataset.imageWidth);
            expect(callToActionNode.linkColor).toBe(dataset.linkColor);
        }));

        it('can be created without a dataset', editorTest(function () {
            const callToActionNode = $createCallToActionNode();

            expect(callToActionNode.getDataset()).toEqual({
                layout: 'minimal',
                alignment: 'left',
                textValue: '',
                showButton: true,
                showDividers: true,
                buttonText: 'Learn more',
                buttonUrl: '',
                buttonColor: '#000000',
                buttonTextColor: '#ffffff',
                hasSponsorLabel: true,
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
                backgroundColor: 'grey',
                linkColor: 'text',
                imageUrl: '',
                imageWidth: null,
                imageHeight: null,
                visibility: utils.visibility.buildDefaultVisibility()
            });
        }));

        it('has setters for all properties', editorTest(function () {
            const callToActionNode = new CallToActionNode();
            expect(callToActionNode.layout).toBe('minimal');
            callToActionNode.layout = 'compact';
            expect(callToActionNode.layout).toBe('compact');

            expect(callToActionNode.textValue).toBe('');
            callToActionNode.textValue = 'This is a cool advertisement';
            expect(callToActionNode.textValue).toBe('This is a cool advertisement');

            expect(callToActionNode.showButton).toBe(true);
            callToActionNode.showButton = false;
            expect(callToActionNode.showButton).toBe(false);

            expect(callToActionNode.showDividers).toBe(true);
            callToActionNode.showDividers = false;
            expect(callToActionNode.showDividers).toBe(false);

            expect(callToActionNode.buttonText).toBe('Learn more');
            callToActionNode.buttonText = 'click me';
            expect(callToActionNode.buttonText).toBe('click me');

            expect(callToActionNode.buttonUrl).toBe('');
            callToActionNode.buttonUrl = 'http://blog.com/post1';
            expect(callToActionNode.buttonUrl).toBe('http://blog.com/post1');

            expect(callToActionNode.sponsorLabel).toBe('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>');
            callToActionNode.sponsorLabel = 'This post is brought to you by our sponsors';
            expect(callToActionNode.sponsorLabel).toBe('This post is brought to you by our sponsors');

            expect(callToActionNode.buttonColor).toBe('#000000');
            callToActionNode.buttonColor = '#ffffff';
            expect(callToActionNode.buttonColor).toBe('#ffffff');

            expect(callToActionNode.buttonTextColor).toBe('#ffffff');
            callToActionNode.buttonTextColor = 'black';
            expect(callToActionNode.buttonTextColor).toBe('black');

            expect(callToActionNode.hasSponsorLabel).toBe(true);
            callToActionNode.hasSponsorLabel = false;
            expect(callToActionNode.hasSponsorLabel).toBe(false);

            expect(callToActionNode.backgroundColor).toBe('grey');
            callToActionNode.backgroundColor = 'red';
            expect(callToActionNode.backgroundColor).toBe('red');

            expect(callToActionNode.imageUrl!).toBe('');
            callToActionNode.imageUrl = 'http://blog.com/image1.jpg';
            expect(callToActionNode.imageUrl!).toBe('http://blog.com/image1.jpg');

            expect(callToActionNode.imageHeight).toBeNull();
            callToActionNode.imageHeight = 100;
            expect(callToActionNode.imageHeight!).toBe(100);

            expect(callToActionNode.imageWidth).toBeNull();
            callToActionNode.imageWidth = 200;
            expect(callToActionNode.imageWidth!).toBe(200);

            expect(callToActionNode.visibility as Record<string, unknown>).toEqual(utils.visibility.buildDefaultVisibility());
            callToActionNode.visibility = {
                web: {
                    nonMember: false,
                    memberSegment: ''
                },
                email: {
                    memberSegment: ''
                }
            };
            expect(callToActionNode.visibility as Record<string, unknown>).toEqual({
                web: {
                    nonMember: false,
                    memberSegment: ''
                },
                email: {
                    memberSegment: ''
                }
            });

            expect(callToActionNode.linkColor).toBe('text');
            callToActionNode.linkColor = 'accent';
            expect(callToActionNode.linkColor).toBe('accent');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            const callToActionNodeDataset = callToActionNode.getDataset();

            expect(callToActionNodeDataset).toEqual({
                ...dataset,
                alignment: 'left',
                ...{visibility: utils.visibility.buildDefaultVisibility()}
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(CallToActionNode.getType()).toBe('call-to-action');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            const callToActionNodeDataset = callToActionNode.getDataset();
            const clone = CallToActionNode.clone(callToActionNode) as CallToActionNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...callToActionNodeDataset});
        }));
    });

    describe.todo('urlTransformMap');

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            expect(callToActionNode.hasEditMode()).toBe(true);
        }));
    });

    describe('exportDOM', function () {
        const testRender = (assertFn: (result: {element: HTMLElement; type: ExportDOMOutputType; html: string}) => void) => {
            const callToActionNode = new CallToActionNode(dataset);
            const result = callToActionNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;
            const {type} = result;

            const html = element.outerHTML.toString();
            assertFn({element, type, html});
        };

        it('has all data attributes in Web', editorTest(function () {
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p>Sponsored by</p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'minimal',
                showButton: true,
                showDividers: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>'
            };

            testRender(({html}) => {
                expect(html).toContain('data-layout="minimal"');
                expect(html).toContain('kg-cta-bg-green');
                expect(html).toContain('background-color: #F0F0F0');
                expect(html).toContain('Get access now');
                expect(html).toContain('http://someblog.com/somepost');
                expect(html).toContain('/content/images/2022/11/koenig-lexical.jpg');
                expect(html).toContain('This is a new CTA Card.');
                expect(html).toContain('Sponsored by'); // because hasSponsorLabel is true
                expect(html).toContain('cta-card');
            });
        }));

        it('has all data attributes in Email', editorTest(function () {
            exportOptions.target = 'email';
            exportOptions.canTransformImage = () => true;
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'immersive',
                showButton: true,
                showDividers: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card via email.</span></p>'
            };

            testRender(({html}) => {
                expect(html).toContain('kg-cta-bg-green');
                expect(html).toContain('background-color: #F0F0F0');
                expect(html).toContain('Get access now');
                expect(html).toContain('http://someblog.com/somepost');
                expect(html).toContain('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'); // because hasSponsorLabel is true
                expect(html).toContain('/content/images/2022/11/koenig-lexical.jpg');
                expect(html).toContain('This is a new CTA Card via email.');
            });
        }));

        it('uses default buttonText when created with empty buttonText (web)', editorTest(function () {
            dataset.showButton = true;
            dataset.showDividers = true;
            dataset.buttonText = '';

            testRender(({html}) => {
                expect(html).toContain('<a href="http://blog.com/post1"');
                expect(html).toContain('Learn more');
            });
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p>This post is brought to you by our sponsors</p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                imageWidth: 200,
                imageHeight: 100,
                layout: 'minimal',
                showButton: true,
                showDividers: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>'
            };
            const callToActionNode = new CallToActionNode(dataset);
            const json = callToActionNode.exportJSON();

            expect(json).toEqual({
                type: 'call-to-action',
                version: 1,
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p>This post is brought to you by our sponsors</p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                imageWidth: 200,
                imageHeight: 100,
                layout: 'minimal',
                showButton: true,
                showDividers: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>',
                linkColor: 'text',
                alignment: 'left',
                visibility: {
                    web: {
                        nonMember: true,
                        memberSegment: 'status:free,status:-free'
                    },
                    email: {
                        memberSegment: 'status:free,status:-free'
                    }
                }
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedData = JSON.stringify({
                    root: {
                        children: [{
                            type: 'call-to-action',
                            backgroundColor: 'green',
                            buttonColor: '#F0F0F0',
                            buttonText: 'Get access now',
                            buttonTextColor: '#000000',
                            buttonUrl: 'http://someblog.com/somepost',
                            hasSponsorLabel: true,
                            sponsorLabel: '<p>This post is brought to you by our sponsors</p>',
                            imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                            layout: 'minimal',
                            showButton: true,
                            showDividers: true,
                            textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>'
                        }],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'root',
                        version: 1
                    }
                });

                const editorState = editor.parseEditorState(serializedData);
                editor.setEditorState(editorState);

                editor.getEditorState().read(() => {
                    try {
                        const [callToActionNode] = $getRoot().getChildren();
                        expect($isCallToActionNode(callToActionNode)).toBe(true);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            expect(CallToActionNode.getType()).toBe('call-to-action');
        }));

        it('urlTransformMap', editorTest(function () {
            // not yet implemented
        }));
    });

    describe('importDom', function () {
        const generateCallToActionNodes = (nodeDataset: Record<string, unknown>) => {
            const callToActionNode = new CallToActionNode(nodeDataset);
            const result = callToActionNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;
            const docuement = createDocument(htmlTemplate`${element.outerHTML.toString()}`);
            const nodes = $generateNodesFromDOM(editor, docuement) as CallToActionNode[];

            return nodes;
        };
        it('parses the cta card layout', editorTest(function () {
            dataset.layout = 'immersive';
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].layout).toBe('immersive');
        }));

        it('parses text value', editorTest(function () {
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].textValue).toBe('This is a cool advertisement');
        }));

        it('checks if button is visible', editorTest(function (){
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].showButton).toBe(true);
        }));

        it('checks if button is not visible', editorTest(function (){
            dataset.showButton = false;
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].showButton).toBe(false);
        }));

        it('can get button text', editorTest(function () {
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].buttonText).toBe('click me');
        }));

        it('can get button URL', editorTest(function (){
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].buttonUrl).toBe('http://blog.com/post1');
        }));

        it('can get button colours', editorTest(function () {
            dataset.buttonColor = '#123456';
            dataset.buttonTextColor = '#654321';
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].buttonColor).toBe('#123456');
            expect(nodes[0].buttonTextColor).toBe('#654321');
        }));

        it('can check if it has a sponsorLabel', editorTest(function () {
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].hasSponsorLabel).toBe(true);
        }));

        it('returns false if it does not have a sponsorLabel', editorTest(function () {
            dataset.hasSponsorLabel = false;
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].hasSponsorLabel).toBe(false);
        }));

        it('can get sponsorLabel', editorTest(function () {
            dataset.sponsorLabel = '<p><span style="white-space: pre-wrap">SPONSORED BY GHOST</span></p>';
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].sponsorLabel).toBe('<p><span style="white-space: pre-wrap">SPONSORED BY GHOST</span></p>');
        }));

        it('can get background color', editorTest(function () {
            dataset.backgroundColor = 'red';
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].backgroundColor).toBe('red');
        }));

        it('can get image data', editorTest(function () {
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].imageUrl!).toBe('http://blog.com/image1.jpg');
            expect(nodes[0].imageWidth!).toBe(200);
            expect(nodes[0].imageHeight!).toBe(100);
        }));

        it('image width and height falls back to null if not provided', editorTest(function () {
            dataset.imageWidth = null;
            dataset.imageHeight = null;
            const nodes = generateCallToActionNodes(dataset);
            expect(nodes.length).toBe(1);
            expect(nodes[0].imageWidth).toBeNull();
            expect(nodes[0].imageHeight).toBeNull();
        }));
    });

    describe('getTextContent', function () {
        it('returns textValue', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            expect(callToActionNode.getTextContent()).toBe('This is a cool advertisement\n\n');
        }));
    });
});
