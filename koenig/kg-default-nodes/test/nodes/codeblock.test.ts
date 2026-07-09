import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {CodeBlockNode, $createCodeBlockNode, $isCodeBlockNode} from '../../src/index.js';
import {$getRoot, type LexicalEditor} from 'lexical';

const editorNodes = [CodeBlockNode];

describe('CodeBlockNode', function () {
    let dataset: Record<string, unknown>;
    let editor: LexicalEditor;
    let code: string;
    let language: string;
    let caption: string;
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

        code = '<script></script>';
        language = 'javascript';
        caption = 'A code block';

        dataset = {
            code,
            language,
            caption
        };

        exportOptions = {
            dom
        };
    });

    it('matches node with $isCodeBlockNode', editorTest(function () {
        const codeBlockNode = $createCodeBlockNode({language, code, caption});
        expect($isCodeBlockNode(codeBlockNode)).toBe(true);
    }));

    describe('importJSON', function () {
        it('imports all properties', function () {
            return new Promise<void>((resolve, reject) => {
                const serialized = `
                    {
                        "root": {
                            "children": [
                                {
                                    "type": "codeblock",
                                    "code": "<?php echo 'Hello World'; ?>",
                                    "language": "php",
                                    "caption": "Your first PHP enabled page"
                                }
                            ],
                            "direction": null,
                            "format": "",
                            "indent": 0,
                            "type": "root",
                            "version": 1
                        }
                    }
                `;

                const editorState = editor.parseEditorState(serialized);

                editorState.read(() => {
                    try {
                        const codeBlockNode = $getRoot().getChildren()[0] as CodeBlockNode;
                        expect(codeBlockNode.code).toBe(`<?php echo 'Hello World'; ?>`);
                        expect(codeBlockNode.language).toBe('php');
                        expect(codeBlockNode.caption).toBe('Your first PHP enabled page');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('exportJSON', function () {
        it('exports all properties', function () {
            return new Promise<void>((resolve, reject) => {
                editor.update(() => {
                    try {
                        const codeBlockNode = $createCodeBlockNode({code, language, caption});
                        $getRoot().append(codeBlockNode);
                    } catch (e) {
                        reject(e);
                    }
                }, {discrete: true});

                const parsedExport = JSON.parse(JSON.stringify(editor.getEditorState()));

                expect(parsedExport.root.children).toEqual([
                    {
                        type: 'codeblock',
                        version: 1,
                        code: '<script></script>',
                        language: 'javascript',
                        caption: 'A code block'
                    }
                ]);
                resolve();
            });
        });
    });

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({language, code, caption});

            expect(codeBlockNode.code).toBe('<script></script>');
            expect(codeBlockNode.language).toBe('javascript');
            expect(codeBlockNode.caption).toBe('A code block');
        }));

        it('has setters for all properties', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({language: '', code: '', caption: ''});

            expect(codeBlockNode.language).toBe('');
            codeBlockNode.language = 'javascript';
            expect(codeBlockNode.language).toBe('javascript');

            expect(codeBlockNode.code).toBe('');
            codeBlockNode.code = '<script></script>';
            expect(codeBlockNode.code).toBe('<script></script>');

            expect(codeBlockNode.caption).toBe('');
            codeBlockNode.caption = 'A code block';
            expect(codeBlockNode.caption).toBe('A code block');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({language, code, caption});
            const codeBlockNodeDataset = codeBlockNode.getDataset();

            expect(codeBlockNodeDataset).toEqual({
                code: '<script></script>',
                language: 'javascript',
                caption: 'A code block'
            });
        }));
    });

    describe('isEmpty()', function () {
        it('returns true if markdown is empty', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode(dataset);

            expect(codeBlockNode.isEmpty()).toBe(false);
            codeBlockNode.code = '';
            expect(codeBlockNode.isEmpty()).toBe(true);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(CodeBlockNode.getType()).toBe('codeblock');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode(dataset);
            const codeBlockNodeDataset = codeBlockNode.getDataset();
            const clone = CodeBlockNode.clone(codeBlockNode) as CodeBlockNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...codeBlockNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(CodeBlockNode.urlTransformMap).toEqual({
                caption: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode(dataset);
            expect(codeBlockNode.hasEditMode()).toBe(true);
        }));
    });

    describe('exportDOM', function () {
        it('renders and escapes', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({code});
            const {element} = codeBlockNode.exportDOM(editor, exportOptions);
            const el = element as HTMLElement;

            assertPrettifiesTo(el.outerHTML, html`
                <pre><code>&lt;script&gt;&lt;/script&gt;</code></pre>
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses PRE>CODE inside FIGURE into code card', editorTest(function () {
            const document = createDocument(html`
                <figure><pre><code>Test code</code></pre></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].code).toBe('Test code');
            expect(nodes[0].language).toBe('');
            expect(nodes[0].caption).toBe('');
        }));

        it('parses PRE>CODE inside FIGURE with FIGCAPTION into code card', editorTest(function () {
            const document = createDocument(html`
                <figure><pre><code>Test code</code></pre><figcaption>Test caption</figcaption></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].code).toBe('Test code');
            expect(nodes[0].caption).toBe('Test caption');
            expect(nodes[0].language).toBe('');
        }));

        it('extracts language from pre class name for FIGURE>PRE>CODE', editorTest(function () {
            const document = createDocument(html`
                <figure><pre class="language-js"><code>Test code</code></pre><figcaption>Test caption</figcaption></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].code).toBe('Test code');
            expect(nodes[0].caption).toBe('Test caption');
            expect(nodes[0].language).toBe('js');
        }));

        it('extracts language from code class name for FIGURE>PRE>CODE', editorTest(function () {
            const document = createDocument(html`
                <figure><pre><code class="language-js">Test code</code></pre><figcaption>Test caption</figcaption></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].code).toBe('Test code');
            expect(nodes[0].caption).toBe('Test caption');
            expect(nodes[0].language).toBe('js');
        }));

        it('correctly skips if there is no pre tag', editorTest(function () {
            const document = createDocument(html`
                <figure><div><span class="nothing-to-see-here"></span></div></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            expect(nodes.length).toBe(0);
        }));

        it('parses PRE>CODE into code card', editorTest(function () {
            const document = createDocument(html`
                <figure><pre><code>Test code</code></pre></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].code).toBe('Test code');
            expect(nodes[0].language).toBe('');
            expect(nodes[0].caption).toBe('');
        }));

        it('extracts language from pre class name for PRE>CODE', editorTest(function () {
            const document = createDocument(html`
                <figure><pre class="language-javascript"><code>Test code</code></pre></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].code).toBe('Test code');
            expect(nodes[0].language).toBe('javascript');
            expect(nodes[0].caption).toBe('');
        }));

        it('extracts language from code class name for PRE>CODE', editorTest(function () {
            const document = createDocument(html`
                <figure><pre><code class="language-ruby">Test code</code></pre></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].code).toBe('Test code');
            expect(nodes[0].language).toBe('ruby');
            expect(nodes[0].caption).toBe('');
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createCodeBlockNode();
            expect(node.getTextContent()).toBe('');

            node.code = '<script>const test = true;</script>';
            node.caption = 'Test caption';

            expect(node.getTextContent()).toBe('<script>const test = true;</script>\nTest caption\n\n');
        }));
    });
});
