const {createHeadlessEditor} = require('@lexical/headless');
const {TKNode, $createTKNode, $isTKNode} = require('../../');

const editorNodes = [TKNode];

describe('TKNode', function () {
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

    it('matches node with $isTKNode', editorTest(function () {
        const tkNode = $createTKNode();
        $isTKNode(tkNode).should.be.true;
    }));

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const tkNode = $createTKNode('TK');
            const json = tkNode.exportJSON();

            json.should.deepEqual({
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                type: 'tk',
                version: 1,
                text: 'TK'
            });
        }));
    });
});