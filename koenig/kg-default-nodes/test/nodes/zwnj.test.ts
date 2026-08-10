import {createHeadlessEditor} from '@lexical/headless';
import {ZWNJNode, $createZWNJNode, $isZWNJNode} from '../../src/index.js';
import type {LexicalEditor} from 'lexical';

const editorNodes = [ZWNJNode];

describe('ZWNJNode', function () {
    let editor: LexicalEditor;

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
    });

    it('matches node with $isZWNJNode', editorTest(function () {
        const zwnjNode = $createZWNJNode();
        expect($isZWNJNode(zwnjNode)).toBe(true);
    }));
});
