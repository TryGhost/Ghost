const {createHeadlessEditor} = require('@lexical/headless');
const {$getRoot} = require('lexical');
const {dom, html} = require('../utils');
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
            dom
        };
    });

    it('matches node with $isEmailNode', editorTest(function () {
        const emailNode = $createEmailNode(dataset);
        $isEmailNode(emailNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const emailNode = $createEmailNode(dataset);

            emailNode.html.should.equal(dataset.html);
        }));

        it('has setters for all properties', editorTest(function () {
            const emailNode = $createEmailNode();

            emailNode.html.should.equal('');
            emailNode.html = '<p>Hello World</p>';
            emailNode.html.should.equal('<p>Hello World</p>');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const emailNodeDataset = emailNode.getDataset();

            emailNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            EmailNode.getType().should.equal('email');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const emailNodeDataset = emailNode.getDataset();
            const clone = EmailNode.clone(emailNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...emailNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            EmailNode.urlTransformMap.should.deepEqual({
                html: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            emailNode.hasEditMode().should.be.true();
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

                    emailNode.html.should.equal(dataset.html);
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
                <p><span>Hey you</span></p>
            `);
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
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

            element.innerHTML.should.prettifyTo(html`
                <p>Hey {foo invalid}</p>
            `);
        }));

        it('renders multiple paragraphs', editorTest(function () {
            const payload = {
                html: '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.innerHTML.should.prettifyTo(html`
                <p>First paragraph</p>
                <p>Second paragraph</p>
                <p>Third paragraph</p>
            `);
        }));

        it('strips out <code> elements with placeholders', editorTest(function () {
            const payload = {
                html: '<p>First paragraph</p><code>{placeholder}</code><p>Third paragraph</p>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };

            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.innerHTML.should.prettifyTo(html`
                <p>First paragraph</p>
                %%{placeholder}%%
                <p>Third paragraph</p>
            `);
        }));

        it(`leaves <code> elements when not used with a placeholder`, editorTest(function () {
            const payload = {
                html: '<p>First paragraph</p><code>Some code</code><p>Third paragraph</p><code>{helper, "test"}</code>'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };

            const emailNode = $createEmailNode(payload);
            const {element} = emailNode.exportDOM({...exportOptions, ...options});

            element.innerHTML.should.prettifyTo(html`
                <p>First paragraph</p>
                <code>Some code</code>
                <p>Third paragraph</p>
                %%{helper, "test"}%%
            `);
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createEmailNode();
            node.html = 'Testing';

            // email nodes don't have text content
            node.getTextContent().should.equal('');
        }));
    });
});
