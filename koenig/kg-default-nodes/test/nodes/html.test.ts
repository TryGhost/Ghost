import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot, type LexicalEditor} from 'lexical';
import {HtmlNode, $createHtmlNode, $isHtmlNode, type ExportDOMOptions, utils} from '../../src/index.js';
import {$generateNodesFromDOM} from '@lexical/html';

const editorNodes = [HtmlNode];
const {ALL_MEMBERS_SEGMENT} = utils.visibility;

describe('HtmlNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: ExportDOMOptions;

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
        editor = createHeadlessEditor({nodes: editorNodes, onError: (e: Error) => {
            throw e;
        }});

        dataset = {
            html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>'
        };

        exportOptions = {
            dom
        };
    });

    it('matches node with $isImageNode', editorTest(function () {
        const htmlNode = $createHtmlNode(dataset);
        expect($isHtmlNode(htmlNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            expect(htmlNode.html).toBe('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');
        }));

        it('has setters for all properties', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            expect(htmlNode.html).toBe('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');
            htmlNode.html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
            expect(htmlNode.html).toBe('<p>Paragraph 1</p><p>Paragraph 2</p>');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const htmlNodeDataset = htmlNode.getDataset();

            expect(htmlNodeDataset).toEqual({
                ...dataset,
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

        it('has isEmpty() convenience method', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            expect(htmlNode.isEmpty()).toBe(false);
            htmlNode.html = '';
            expect(htmlNode.isEmpty()).toBe(true);
        }));
    });

    describe('isEmpty()', function () {
        it('returns true if markdown is empty', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            expect(htmlNode.isEmpty()).toBe(false);
            htmlNode.html = '';
            expect(htmlNode.isEmpty()).toBe(true);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(HtmlNode.getType()).toBe('html');
        }));
    });

    describe('getPropertyDefaults', function () {
        it('returns the correct default values', editorTest(function () {
            const defaults = HtmlNode.getPropertyDefaults();

            expect(defaults).toEqual({
                html: '',
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

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const htmlNodeDataset = htmlNode.getDataset();
            const clone = HtmlNode.clone(htmlNode) as HtmlNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...htmlNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(HtmlNode.urlTransformMap).toEqual({
                html: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            expect(htmlNode.hasEditMode()).toBe(true);
        }));
    });

    describe('exportDOM', function () {
        it('creates a html card', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const result = htmlNode.exportDOM(editor, exportOptions);
            expect(result.type).toBe('value');
            const element = result.element as HTMLTextAreaElement;
            assertPrettifiesTo(element.value, html`
                <!--kg-card-begin: html-->
                <p>Paragraph with:</p>
                <ul>
                    <li>list</li>
                    <li>items</li>
                </ul>
                <!--kg-card-end: html-->
            `);
        }));

        it('creates a html card for email', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const result = htmlNode.exportDOM(editor, {...exportOptions, target: 'email'});
            expect(result.type).toBe('value');
            const element = result.element as HTMLTextAreaElement;
            assertPrettifiesTo(element.value, html`
                <!--kg-card-begin: html-->
                <p>Paragraph with:</p>
                <ul>
                    <li>list</li>
                    <li>items</li>
                </ul>
                <!--kg-card-end: html-->
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses a html node', editorTest(function () {
            const document = createDocument(html`
                <span><!--kg-card-begin: html--><p>here's html</p><!--kg-card-end: html--></span>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect(nodes.length).toBe(1);
            expect(nodes[0]).toBeInstanceOf(HtmlNode);
        }));

        it('removes the html end comment from the DOM after parsing', editorTest(function () {
            const document = createDocument(html`
                <span><!--kg-card-begin: html--><p>here's html</p><!--kg-card-end: html--></span>
            `);

            $generateNodesFromDOM(editor, document);

            const hasEndComment = Array.from(document.querySelector('span')?.childNodes || []).some((node) => {
                return node.nodeType === 8 && node.nodeValue?.trim() === 'kg-card-end: html';
            });

            expect(hasEndComment).toBe(false);
        }));

        it('does not consume sibling nodes when the html end comment is missing', editorTest(function () {
            const document = createDocument(html`
                <span><!--kg-card-begin: html--><p>here's html</p><div>keep me</div></span>
            `);

            const nodes = $generateNodesFromDOM(editor, document) as HtmlNode[];
            const htmlNodes = nodes.filter(node => node instanceof HtmlNode);

            expect(htmlNodes.length).toBe(1);
            expect(htmlNodes[0].html).toBe('');
            expect(document.querySelector('p')?.outerHTML).toBe('<p>here\'s html</p>');
            expect(document.querySelector('div')?.outerHTML).toBe('<div>keep me</div>');
        }));

        it('parses html table', editorTest(function () {
            const document = createDocument(html`
                <table style="float:right"><tr><th>Month</th><th>Savings</th></tr><tr><td>January</td><td>$100</td></tr><tr><td>February</td><td>$80</td></tr></table>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect(nodes.length).toBe(1);
            expect(nodes[0]).toBeInstanceOf(HtmlNode);
        }));

        it('parses table nested in another table', editorTest(function () {
            const document = createDocument(html`
                <table id="table1"><tr><th>title1</th><th>title2</th><th>title3</th></tr><tr><td id="nested"><table id="table2"><tr><td>cell1</td><td>cell2</td><td>cell3</td></tr></table></td><td>cell2</td><td>cell3</td></tr><tr><td>cell4</td><td>cell5</td><td>cell6</td></tr></table>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            expect(nodes.length).toBe(1);
            expect(nodes[0]).toBeInstanceOf(HtmlNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const json = htmlNode.exportJSON();

            expect(json).toEqual({
                type: 'html',
                version: 1,
                html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
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
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'html',
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
                        const [htmlNode] = $getRoot().getChildren() as HtmlNode[];

                        expect(htmlNode.html).toBe('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });

        it('updates old visibility format to new format', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'html',
                            html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
                            visibility: {
                                showOnEmail: true,
                                showOnWeb: true
                            }
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
                        const [htmlNode] = $getRoot().getChildren() as HtmlNode[];

                        expect(htmlNode.visibility as Record<string, unknown>).toEqual({
                            showOnWeb: true,
                            showOnEmail: true,
                            web: {
                                nonMember: true,
                                memberSegment: 'status:free,status:-free'
                            },
                            email: {
                                memberSegment: 'status:free,status:-free'
                            }
                        });

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createHtmlNode();
            expect(node.getTextContent()).toBe('');

            node.html = '<script>const test = true;</script>';

            expect(node.getTextContent()).toBe('<script>const test = true;</script>\n\n');
        }));
    });

    describe('getIsVisibilityActive', function () {
        function testIsVisibilityActive(expected: boolean, visibility: Record<string, unknown>) {
            const node = $createHtmlNode();
            node.visibility = visibility;
            expect(node.getIsVisibilityActive()).toBe(expected);
        }

        describe('with old visibility format', function () {
            it('returns false when both showOnEmail and showOnWeb are true and segment is blank', editorTest(function () {
                testIsVisibilityActive(false, {showOnEmail: true, showOnWeb: true, segment: ''});
            }));

            it('returns true when showOnEmail is false', editorTest(function () {
                testIsVisibilityActive(true, {showOnEmail: false, showOnWeb: true, segment: ''});
            }));

            it('returns true when showOnWeb is false', editorTest(function () {
                testIsVisibilityActive(true, {showOnEmail: true, showOnWeb: false, segment: ''});
            }));

            it('returns true when segment is not empty', editorTest(function () {
                testIsVisibilityActive(true, {showOnEmail: true, showOnWeb: true, segment: 'status:-free'});
            }));
        });

        describe('with new visibility format', function () {
            it('returns false when shown to everyone', editorTest(function () {
                testIsVisibilityActive(false, {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}});
            }));

            it('returns true when hidden on web for non-members', editorTest(function () {
                testIsVisibilityActive(true, {web: {nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}});
            }));

            it('returns true when hidden on web for members', editorTest(function () {
                testIsVisibilityActive(true, {web: {nonMember: true, memberSegment: 'status:free'}, email: {memberSegment: ALL_MEMBERS_SEGMENT}});
            }));

            it('returns true when hidden on email for all members', editorTest(function () {
                testIsVisibilityActive(true, {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ''}});
            }));

            it('returns true when hidden on email for some members', editorTest(function () {
                testIsVisibilityActive(true, {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: 'status:free'}});
            }));
        });
    });
});
