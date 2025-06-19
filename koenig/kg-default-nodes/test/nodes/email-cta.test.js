const {createHeadlessEditor} = require('@lexical/headless');
const {$getRoot} = require('lexical');
const {EmailCtaNode, $createEmailCtaNode, $isEmailCtaNode} = require('../../');

const editorNodes = [EmailCtaNode];

describe('EmailCtaNode', function () {
    let editor;
    let dataset;

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
    });

    it('matches node with $isEmailCtaNode', editorTest(function () {
        const emailCtaNode = $createEmailCtaNode(dataset);
        $isEmailCtaNode(emailCtaNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const emailNode = $createEmailCtaNode(dataset);

            emailNode.alignment.should.equal(dataset.alignment);
            emailNode.buttonText.should.equal(dataset.buttonText);
            emailNode.buttonUrl.should.equal(dataset.buttonUrl);
            emailNode.html.should.equal(dataset.html);
            emailNode.segment.should.equal(dataset.segment);
            emailNode.showButton.should.equal(dataset.showButton);
            emailNode.showDividers.should.equal(dataset.showDividers);
        }));

        it('has setters for all properties', editorTest(function () {
            const emailNode = $createEmailCtaNode();

            emailNode.alignment.should.equal('left');
            emailNode.alignment = 'center';
            emailNode.alignment.should.equal('center');

            emailNode.buttonText.should.equal('');
            emailNode.buttonText = 'Hello World';
            emailNode.buttonText.should.equal('Hello World');

            emailNode.buttonUrl.should.equal('');
            emailNode.buttonUrl = 'https://example.com';
            emailNode.buttonUrl.should.equal('https://example.com');

            emailNode.html.should.equal('');
            emailNode.html = '<p>Hello World</p>';
            emailNode.html.should.equal('<p>Hello World</p>');

            emailNode.segment.should.equal('status:free');
            emailNode.segment = 'status:-free';
            emailNode.segment.should.equal('status:-free');

            emailNode.showButton.should.equal(false);
            emailNode.showButton = true;
            emailNode.showButton.should.equal(true);

            emailNode.showDividers.should.equal(true);
            emailNode.showDividers = false;
            emailNode.showDividers.should.equal(false);
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const emailNode = $createEmailCtaNode(dataset);
            const emailNodeDataset = emailNode.getDataset();

            emailNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            EmailCtaNode.getType().should.equal('email-cta');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const emailCtaNode = $createEmailCtaNode(dataset);
            const emailCtaNodeDataset = emailCtaNode.getDataset();
            const clone = EmailCtaNode.clone(emailCtaNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...emailCtaNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            EmailCtaNode.urlTransformMap.should.deepEqual({
                buttonUrl: 'url',
                html: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const emailCtaNode = $createEmailCtaNode(dataset);
            emailCtaNode.hasEditMode().should.be.true();
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const emailNode = $createEmailCtaNode(dataset);
            const json = emailNode.exportJSON();

            json.should.deepEqual({
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
        it('imports all data', function (done) {
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
                    const [emailNode] = $getRoot().getChildren();

                    emailNode.alignment.should.equal(dataset.alignment);
                    emailNode.buttonText.should.equal(dataset.buttonText);
                    emailNode.buttonUrl.should.equal(dataset.buttonUrl);
                    emailNode.html.should.equal(dataset.html);
                    emailNode.segment.should.equal(dataset.segment);
                    emailNode.showButton.should.equal(dataset.showButton);
                    emailNode.showDividers.should.equal(dataset.showDividers);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createEmailCtaNode();
            node.html = 'Testing';

            // email CTA nodes don't have text content
            node.getTextContent().should.equal('');
        }));
    });
});
