const {html} = require('../utils');
// const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
// const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {SignupNode, $isSignupNode, $createSignupNode} = require('../../');

const editorNodes = [SignupNode];

describe('SignupNode', function () {
    let editor;
    // let dataset;
    let exportOptions;

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

        // dataset = {};

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isSignupNode', editorTest(function () {
        const signupNode = $createSignupNode();
        $isSignupNode(signupNode).should.be.true;
    }));

    describe('exportDOM', function () {
        it('creates signup element', editorTest(function () {
            const signupNode = $createSignupNode();
            const {element} = signupNode.exportDOM(exportOptions);
            element.should.prettifyTo(html`
            <form data-members-form=""><input data-members-email="" type="email" required=""><button type="submit">Continue</button></form>
            `);
        }));
    });
});
