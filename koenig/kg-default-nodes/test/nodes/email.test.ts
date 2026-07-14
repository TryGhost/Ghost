import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot, type LexicalEditor} from 'lexical';
import {assertPrettifiesTo, dom, html} from '../test-utils/index.js';
import {EmailNode, $createEmailNode, $isEmailNode} from '../../src/index.js';

const editorNodes = [EmailNode];

describe('EmailNode', function () {
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
            html: ''
        };

        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('matches node with $isEmailNode', editorTest(function () {
        const emailNode = $createEmailNode(dataset);
        expect($isEmailNode(emailNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const emailNode = $createEmailNode(dataset);

            expect(emailNode.html).toBe(dataset.html);
        }));

        it('has setters for all properties', editorTest(function () {
            const emailNode = $createEmailNode();

            expect(emailNode.html).toBe('');
            emailNode.html = '<p>Hello World</p>';
            expect(emailNode.html).toBe('<p>Hello World</p>');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const emailNodeDataset = emailNode.getDataset();

            expect(emailNodeDataset).toEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(EmailNode.getType()).toBe('email');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const emailNodeDataset = emailNode.getDataset();
            const clone = EmailNode.clone(emailNode) as EmailNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...emailNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(EmailNode.urlTransformMap).toEqual({
                html: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            expect(emailNode.hasEditMode()).toBe(true);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const json = emailNode.exportJSON();

            expect(json).toEqual({
                type: 'email',
                version: 1,
                html: dataset.html
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'email',
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
                        const [emailNode] = $getRoot().getChildren() as EmailNode[];

                        expect(emailNode.html).toBe(dataset.html);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('exportDOM', function () {
        it('renders for email target', editorTest(function () {
            const payload = {
                html: '<p>Hello World</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM(editor, {...exportOptions, ...options});
            const el = element as HTMLElement;

            assertPrettifiesTo(el.innerHTML, html`
                <p>Hello World</p>
            `);
        }));

        it('renders nothing if the target is not email', editorTest(function () {
            const payload = {
                html: '<p>Hello World</p>'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM(editor, exportOptions);

            expect((element as HTMLElement).innerHTML).toBe('');
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createEmailNode();
            node.html = 'Testing';

            // email nodes don't have text content
            expect(node.getTextContent()).toBe('');
        }));
    });
});
