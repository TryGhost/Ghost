import '../test-utils/index.js';
import {createHeadlessEditor} from '@lexical/headless';
import {ZWNJNode, $createZWNJNode, $isZWNJNode} from '../../src/index.js';
import type {LexicalEditor} from 'lexical';

const editorNodes = [ZWNJNode];

describe('ZWNJNode', function () {
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

    it('matches node with $isZWNJNode', editorTest(function () {
        const zwnjNode = $createZWNJNode();
        $isZWNJNode(zwnjNode).should.be.true();
    }));
});
