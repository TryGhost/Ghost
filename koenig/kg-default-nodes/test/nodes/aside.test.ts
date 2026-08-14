import {createDocument, html} from '../test-utils/index.js';
import {$getRoot, $createParagraphNode, $createTextNode} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {AsideNode, $createAsideNode, $isAsideNode} from '../../src/index.js';
import type {LexicalEditor} from 'lexical';

const editorNodes = [AsideNode];

describe('AsideNode', function () {
    let editor: LexicalEditor;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => function (done: (err?: unknown) => void) {
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
    });

    it('matches node with $isAsideNode', editorTest(function () {
        const asideNode = $createAsideNode();
        $isAsideNode(asideNode).should.be.true();
    }));

    describe('importDOM', function () {
        it('parses an aside element', editorTest(function () {
            const document = createDocument(html`
                <blockquote class="kg-blockquote-alt">Hello</blockquote>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(AsideNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const asideNode = $createAsideNode();
            const json = asideNode.exportJSON();

            json.should.deepEqual({
                type: 'aside',
                version: 1,
                children: [],
                direction: null,
                format: '',
                indent: 0
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'aside'
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
                    const [asideNode] = $getRoot().getChildren();
                    asideNode.should.be.instanceof(AsideNode);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createAsideNode();
            node.getTextContent().should.equal('');

            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode('Hello'));

            node.append(paragraph);

            node.getTextContent().should.equal('Hello');
        }));
    });
});
