const {createHeadlessEditor} = require('@lexical/headless');
const {JSDOM} = require('jsdom');
const {$getRoot} = require('lexical');
const {html} = require('../utils');
const {EmailCtaNode, $createEmailCtaNode, $isEmailCtaNode} = require('../../');

const editorNodes = [EmailCtaNode];

describe('EmailCtaNode', function () {
    let editor;
    let dataset;
    let exportOptions;

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

        exportOptions = {
            exportFormat: 'html',
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isEmailCtaNode', editorTest(function () {
        const emailCtaNode = $createEmailCtaNode(dataset);
        $isEmailCtaNode(emailCtaNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const emailNode = $createEmailCtaNode(dataset);

            emailNode.getAlignment().should.equal(dataset.alignment);
            emailNode.getButtonText().should.equal(dataset.buttonText);
            emailNode.getButtonUrl().should.equal(dataset.buttonUrl);
            emailNode.getHtml().should.equal(dataset.html);
            emailNode.getSegment().should.equal(dataset.segment);
            emailNode.getShowButton().should.equal(dataset.showButton);
            emailNode.getShowDividers().should.equal(dataset.showDividers);
        }));

        it('has setters for all properties', editorTest(function () {
            const emailNode = $createEmailCtaNode();

            emailNode.getAlignment().should.equal('left');
            emailNode.setAlignment('center');
            emailNode.getAlignment().should.equal('center');

            emailNode.getButtonText().should.equal('');
            emailNode.setButtonText('Hello World');
            emailNode.getButtonText().should.equal('Hello World');

            emailNode.getButtonUrl().should.equal('');
            emailNode.setButtonUrl('https://example.com');
            emailNode.getButtonUrl().should.equal('https://example.com');

            emailNode.getHtml().should.equal('');
            emailNode.setHtml('<p>Hello World</p>');
            emailNode.getHtml().should.equal('<p>Hello World</p>');

            emailNode.getSegment().should.equal('status:free');
            emailNode.setSegment('status:-free');
            emailNode.getSegment().should.equal('status:-free');

            emailNode.getShowButton().should.equal(false);
            emailNode.setShowButton(true);
            emailNode.getShowButton().should.equal(true);

            emailNode.getShowDividers().should.equal(true);
            emailNode.setShowDividers(false);
            emailNode.getShowDividers().should.equal(false);
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const emailNode = $createEmailCtaNode(dataset);
            const emailNodeDataset = emailNode.getDataset();

            emailNodeDataset.should.deepEqual({
                ...dataset
            });
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

                    emailNode.getAlignment().should.equal(dataset.alignment);
                    emailNode.getButtonText().should.equal(dataset.buttonText);
                    emailNode.getButtonUrl().should.equal(dataset.buttonUrl);
                    emailNode.getHtml().should.equal(dataset.html);
                    emailNode.getSegment().should.equal(dataset.segment);
                    emailNode.getShowButton().should.equal(dataset.showButton);
                    emailNode.getShowDividers().should.equal(dataset.showDividers);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('exportDOM', function () {
        it('renders for email target without button', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: 'Test',
                buttonUrl: 'https://example.com',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: false,
                showDividers: true
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <div data-gh-segment="status:free">
                    <hr>
                    <p>Hello World</p>
                    <hr>
                </div>
            `);
        }));

        it('does not render for web', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: '',
                buttonUrl: '',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: false,
                showDividers: true
            };

            const options = {
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.should.be.empty();
        }));

        it('does not render if all empty', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: '',
                buttonUrl: '',
                html: '',
                segment: 'status:free',
                showButton: false,
                showDividers: true
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.should.be.empty();
        }));

        it('does not render if button text empty', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: '',
                buttonUrl: '',
                html: '',
                segment: 'status:free',
                showButton: true,
                showDividers: true
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.should.be.empty();
        }));

        it('does not render button if button text empty', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: '',
                buttonUrl: '',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: true,
                showDividers: true
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <div data-gh-segment="status:free">
                    <hr>
                    <p>Hello World</p>
                    <hr>
                </div>
            `);
        }));

        it('does not render button if button url empty', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: 'Test',
                buttonUrl: '',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: true,
                showDividers: true
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <div data-gh-segment="status:free">
                    <hr>
                    <p>Hello World</p>
                    <hr>
                </div>
            `);
        }));

        it('renders for email target with button', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: 'Test',
                buttonUrl: 'https://example.com',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: true,
                showDividers: true
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <div data-gh-segment="status:free">
                    <hr>
                    <p>Hello World</p>
                    <div class="btn btn-accent">
                        <table border="0" cellspacing="0" cellpadding="0" align="left">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <a href="https://example.com">Test</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <hr>
                </div>
            `);
        }));

        it('renders text with button and no dividers', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: 'Test',
                buttonUrl: 'https://example.com',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: true,
                showDividers: false
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <div data-gh-segment="status:free">
                    <p>Hello World</p>
                    <div class="btn btn-accent">
                        <table border="0" cellspacing="0" cellpadding="0" align="left">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <a href="https://example.com">Test</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `);
        }));

        it('renders only the button', editorTest(function () {
            const payload = {
                alignment: 'left',
                buttonText: 'Test',
                buttonUrl: 'https://example.com',
                html: '',
                segment: 'status:free',
                showButton: true,
                showDividers: false
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <div data-gh-segment="status:free">
                    <div class="btn btn-accent">
                        <table border="0" cellspacing="0" cellpadding="0" align="left">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <a href="https://example.com">Test</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `);
        }));

        it('can align center', editorTest(function () {
            const payload = {
                alignment: 'center',
                buttonText: 'Test',
                buttonUrl: 'https://example.com',
                html: '<p>Hello World</p>',
                segment: 'status:free',
                showButton: true,
                showDividers: true
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailCtaNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <div data-gh-segment="status:free" class="align-center">
                    <hr>
                    <p>Hello World</p>
                    <div class="btn btn-accent">
                        <table border="0" cellspacing="0" cellpadding="0" align="center">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <a href="https://example.com">Test</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <hr>
                </div>
            `);
        }));
    });
});