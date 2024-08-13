require('../utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {ZWNJNode, $createZWNJNode, $isZWNJNode} = require('../../');

const editorNodes = [ZWNJNode];

describe('ZWNJNode', function () {
    let editor;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
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
    });

    it('matches node with $isZWNJNode', editorTest(function () {
        const zwnjNode = $createZWNJNode();
        $isZWNJNode(zwnjNode).should.be.true();
    }));
});
