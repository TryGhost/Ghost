import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot, type LexicalEditor} from 'lexical';
import {assertPrettifiesTo, dom, html} from '../test-utils/index.js';
import {EmailCtaNode, $createEmailCtaNode, $isEmailCtaNode} from '../../src/index.js';

const editorNodes = [EmailCtaNode];

describe('EmailCtaNode', function () {
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
        editor = createHeadlessEditor({
            nodes: editorNodes
        });

        dataset = {
            alignment: 'left',
            buttonText: '',
            buttonUrl: '',
            html: '<p>Hello World</p>',
            segment: 'status:free',
            showButton: false,
            showDividers: true
        };

        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('matches node with $isEmailCtaNode', editorTest(function () {
        const emailCtaNode = $createEmailCtaNode(dataset);
        expect($isEmailCtaNode(emailCtaNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const emailNode = $createEmailCtaNode(dataset);

            expect(emailNode.alignment).toBe(dataset.alignment);
            expect(emailNode.buttonText).toBe(dataset.buttonText);
            expect(emailNode.buttonUrl).toBe(dataset.buttonUrl);
            expect(emailNode.html).toBe(dataset.html);
            expect(emailNode.segment).toBe(dataset.segment);
            expect(emailNode.showButton).toBe(dataset.showButton);
            expect(emailNode.showDividers).toBe(dataset.showDividers);
        }));

        it('has setters for all properties', editorTest(function () {
            const emailNode = $createEmailCtaNode();

            expect(emailNode.alignment).toBe('left');
            emailNode.alignment = 'center';
            expect(emailNode.alignment).toBe('center');

            expect(emailNode.buttonText).toBe('');
            emailNode.buttonText = 'Hello World';
            expect(emailNode.buttonText).toBe('Hello World');

            expect(emailNode.buttonUrl).toBe('');
            emailNode.buttonUrl = 'https://example.com';
            expect(emailNode.buttonUrl).toBe('https://example.com');

            expect(emailNode.html).toBe('');
            emailNode.html = '<p>Hello World</p>';
            expect(emailNode.html).toBe('<p>Hello World</p>');

            expect(emailNode.segment).toBe('status:free');
            emailNode.segment = 'status:-free';
            expect(emailNode.segment).toBe('status:-free');

            expect(emailNode.showButton).toBe(false);
            emailNode.showButton = true;
            expect(emailNode.showButton).toBe(true);

            expect(emailNode.showDividers).toBe(true);
            emailNode.showDividers = false;
            expect(emailNode.showDividers).toBe(false);
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const emailNode = $createEmailCtaNode(dataset);
            const emailNodeDataset = emailNode.getDataset();

            expect(emailNodeDataset).toEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(EmailCtaNode.getType()).toBe('email-cta');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const emailCtaNode = $createEmailCtaNode(dataset);
            const emailCtaNodeDataset = emailCtaNode.getDataset();
            const clone = EmailCtaNode.clone(emailCtaNode) as EmailCtaNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...emailCtaNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(EmailCtaNode.urlTransformMap).toEqual({
                buttonUrl: 'url',
                html: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const emailCtaNode = $createEmailCtaNode(dataset);
            expect(emailCtaNode.hasEditMode()).toBe(true);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const emailNode = $createEmailCtaNode(dataset);
            const json = emailNode.exportJSON();

            expect(json).toEqual({
                type: 'email-cta',
                version: 1,
                alignment: dataset.alignment,
                buttonText: dataset.buttonText,
                buttonUrl: dataset.buttonUrl,
                html: dataset.html,
                segment: dataset.segment,
                showButton: dataset.showButton,
                showDividers: dataset.showDividers
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'email-cta',
                            ...dataset
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
                        const [emailNode] = $getRoot().getChildren() as EmailCtaNode[];

                        expect(emailNode.alignment).toBe(dataset.alignment);
                        expect(emailNode.buttonText).toBe(dataset.buttonText);
                        expect(emailNode.buttonUrl).toBe(dataset.buttonUrl);
                        expect(emailNode.html).toBe(dataset.html);
                        expect(emailNode.segment).toBe(dataset.segment);
                        expect(emailNode.showButton).toBe(dataset.showButton);
                        expect(emailNode.showDividers).toBe(dataset.showDividers);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('exportDOM', function () {
        it('renders for email target without button', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: 'Test',
                buttonUrl: 'https://example.com',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: false,
                showDividers: true
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM(editor, {...exportOptions, ...options});
            const el = element as HTMLElement;

            assertPrettifiesTo(el.outerHTML, html`
                <div data-gh-segment="status:free">
                    <hr>
                    <p>Hello World</p>
                    <hr>
                </div>
            `);
        }));

        it('does not render for web', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: '',
                buttonUrl: '',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: false,
                showDividers: true
            };

            const options = {
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM(editor, {...exportOptions, ...options});
            const el = element as HTMLElement;

            expect(el.outerHTML).toBe('<span></span>');
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createEmailCtaNode();
            node.html = 'Testing';

            // email CTA nodes don't have text content
            expect(node.getTextContent()).toBe('');
        }));
    });
});
