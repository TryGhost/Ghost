const {createHeadlessEditor} = require('@lexical/headless');
const {JSDOM} = require('jsdom');
const {$getRoot} = require('lexical');
const {html} = require('../utils');
const {EmailNode, $createEmailNode, $isEmailNode} = require('../../');

const editorNodes = [EmailNode];

describe('EmailNode', function () {
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
            html: ''
        };

        exportOptions = {
            exportFormat: 'html',
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isEmailNode', editorTest(function () {
        const emailNode = $createEmailNode(dataset);
        $isEmailNode(emailNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const emailNode = $createEmailNode(dataset);

            emailNode.getHtml().should.equal(dataset.html);
        }));

        it('has setters for all properties', editorTest(function () {
            const emailNode = $createEmailNode();

            emailNode.getHtml().should.equal('');
            emailNode.setHtml('<p>Hello World</p>');
            emailNode.getHtml().should.equal('<p>Hello World</p>');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const emailNodeDataset = emailNode.getDataset();

            emailNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const json = emailNode.exportJSON();

            json.should.deepEqual({
                type: 'email',
                version: 1,
                html: dataset.html
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'email',
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

                    emailNode.getHtml().should.equal(dataset.html);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('exportDOM', function () {
        it('renders for email target', editorTest(function () {
            const payload = {
                html: '<p>Hello World</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hello World</p>
            `);
        }));

        it('renders nothing if the target is not email', editorTest(function () {
            const payload = {
                html: '<p>Hello World</p>'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM(exportOptions);

            element.should.be.empty();
        }));

        it('renders nothing if the `html` payload is empty', editorTest(function () {
            const payload = {
                html: ''
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.should.be.empty();
        }));

        it('wraps {foo} in %%', editorTest(function () {
            const payload = {
                html: '<p>Hey {foo}</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hey %%{foo}%%</p>
            `);
        }));

        it('wraps {foo, "default"} in %%', editorTest(function () {
            const payload = {
                html: '<p>Hey {foo, "default"}</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hey %%{foo, "default"}%%</p>
            `);
        }));

        it('wraps {foo,  "default"} in %% (extra spaces)', editorTest(function () {
            const payload = {
                html: '<p>Hey {foo,  "default"}</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hey %%{foo,  "default"}%%</p>
            `);
        }));

        it('wraps {foo "default"} in %% (missing comma)', editorTest(function () {
            const payload = {
                html: '<p>Hey {foo "default"}</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hey %%{foo "default"}%%</p>
            `);
        }));

        it('wraps {foo  "default"} in %% (extra space, missing comma)', editorTest(function () {
            const payload = {
                html: '<p>Hey {foo  "default"}</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hey %%{foo  "default"}%%</p>
            `);
        }));

        it('does not wrap {invalid } in %% (invalid space at the end)', editorTest(function () {
            const payload = {
                html: '<p>Hey {foo}, you are {invalid }</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hey %%{foo}%%, you are {invalid }</p>
            `);
        }));

        it('does not wrap { invalid} in %% (invalid space at the beginning)', editorTest(function () {
            const payload = {
                html: '<p>Hey {foo}, you are { invalid}</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hey %%{foo}%%, you are { invalid}</p>
            `);
        }));

        it('does not wrap {foo invalid} in %% (two words, missing quotes)', editorTest(function () {
            const payload = {
                html: '<p>Hey {foo invalid}</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p>Hey {foo invalid}</p>
            `);
        }));

        it('removes any <code> wrapper around the replacement strings', editorTest(function () {
            const payload = {
                html: '<p><span>Hey </span><code><span>{first_name, \"there\"}</span></code><span>, how are you?</span></p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p><span>Hey </span><span>%%{first_name, \"there\"}%%</span><span>, how are you?</span></p>
            `);
        }));

        it('removes any extra consecutives whitespaces', editorTest(function () {
            const payload = {
                html: '<p><span>Hey    you</span></p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p><span>Hey you</span></p>
            `);
        }));

        it('removes any linebreaks', editorTest(function () {
            const payload = {
                html: '<p>\n<span>Hey \nyou</span>\n</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <p><span>Hey you</span></p>
            `);
        }));
    });
});