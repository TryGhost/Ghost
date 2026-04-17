const {createDocument, dom, html} = require('../test-utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {$getRoot} = require('lexical');
const {HtmlNode, $createHtmlNode, $isHtmlNode, utils} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [HtmlNode];
const {ALL_MEMBERS_SEGMENT, NO_MEMBERS_SEGMENT} = utils.visibility;

describe('HtmlNode', function () {
    let editor;
    let dataset;
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
        editor = createHeadlessEditor({nodes: editorNodes, onError: (e) => {
            throw e;
        }});

        dataset = {
            html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>'
        };

        exportOptions = {
            dom
        };
    });

    it('matches node with $isImageNode', editorTest(function () {
        const htmlNode = $createHtmlNode(dataset);
        $isHtmlNode(htmlNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            htmlNode.html.should.equal('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');
        }));

        it('has setters for all properties', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            htmlNode.html.should.equal('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');
            htmlNode.html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
            htmlNode.html.should.equal('<p>Paragraph 1</p><p>Paragraph 2</p>');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const htmlNodeDataset = htmlNode.getDataset();

            htmlNodeDataset.should.deepEqual({
                ...dataset,
                visibility: {
                    web: {
                        nonMember: true,
                        memberSegment: 'status:free,status:-free'
                    },
                    email: {
                        memberSegment: 'status:free,status:-free'
                    }
                }
            });
        }));

        it('has isEmpty() convenience method', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            htmlNode.isEmpty().should.be.false();
            htmlNode.html = '';
            htmlNode.isEmpty().should.be.true();
        }));
    });

    describe('isEmpty()', function () {
        it('returns true if markdown is empty', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            htmlNode.isEmpty().should.be.false();
            htmlNode.html = '';
            htmlNode.isEmpty().should.be.true();
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            HtmlNode.getType().should.equal('html');
        }));
    });

    describe('getPropertyDefaults', function () {
        it('returns the correct default values', editorTest(function () {
            const defaults = HtmlNode.getPropertyDefaults();

            defaults.should.deepEqual({
                html: '',
                visibility: {
                    web: {
                        nonMember: true,
                        memberSegment: 'status:free,status:-free'
                    },
                    email: {
                        memberSegment: 'status:free,status:-free'
                    }
                }
            });
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const htmlNodeDataset = htmlNode.getDataset();
            const clone = HtmlNode.clone(htmlNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...htmlNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            HtmlNode.urlTransformMap.should.deepEqual({
                html: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            htmlNode.hasEditMode().should.be.true();
        }));
    });

    describe('exportDOM', function () {
        it('creates a html card', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const {element, type} = htmlNode.exportDOM(exportOptions);
            type.should.equal('value');
            element.value.should.prettifyTo(html`
                <!--kg-card-begin: html-->
                <p>Paragraph with:</p>
                <ul>
                    <li>list</li>
                    <li>items</li>
                </ul>
                <!--kg-card-end: html-->
            `);
        }));

        it('renders an empty span with missing html', editorTest(function () {
            const htmlNode = $createHtmlNode();
            const {element, type} = htmlNode.exportDOM(exportOptions);
            type.should.equal('inner');

            element.outerHTML.should.equal('<span></span>');
        }));

        it('renders unclosed tags', editorTest(function () {
            const htmlNode = $createHtmlNode({html: '<div style="color:red">'});
            const {element, type} = htmlNode.exportDOM(exportOptions);
            type.should.equal('value');

            // do not prettify, it will add a closing tag to the compared string causing a false pass
            element.value.should.equal('\n<!--kg-card-begin: html-->\n<div style="color:red">\n<!--kg-card-end: html-->\n');
        }));

        it('renders html entities', editorTest(function () {
            const htmlNode = $createHtmlNode({html: '<p>&lt;pre&gt;Test&lt;/pre&gt;</p>'});
            const {element, type} = htmlNode.exportDOM(exportOptions);
            type.should.equal('value');

            element.value.should.equal('\n<!--kg-card-begin: html-->\n<p>&lt;pre&gt;Test&lt;/pre&gt;</p>\n<!--kg-card-end: html-->\n');
        }));

        it('handles single-quote attributes', editorTest(function () {
            const htmlNode = $createHtmlNode({html: '<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>'});
            const {element, type} = htmlNode.exportDOM(exportOptions);
            type.should.equal('value');

            element.value.should.equal('\n<!--kg-card-begin: html-->\n<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>\n<!--kg-card-end: html-->\n');
        }));

        describe('visibility rendering', function () {
            describe('with old visibility settings', function () {
                function testWebRender(visibility) {
                    const htmlNode = $createHtmlNode({html: '<div>Test</div>', visibility});
                    const {element, type} = htmlNode.exportDOM(exportOptions);
                    type.should.equal('value');
                    element.value.should.equal('\n<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->\n');
                }

                function testEmailRender(visibility) {
                    const htmlNode = $createHtmlNode({html: '<div>Test</div>', visibility});
                    const {element, type} = htmlNode.exportDOM({...exportOptions, target: 'email'});
                    const expectedContents = '<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->';

                    if (visibility.segment) {
                        type.should.equal('html');
                        element.outerHTML.should.equal(`<div data-gh-segment="${visibility.segment}">\n${expectedContents}\n</div>`);
                    } else {
                        type.should.equal('value');
                        element.value.should.equal(`\n${expectedContents}\n`);
                    }
                }

                function testBlankRender(visibility, target) {
                    const htmlNode = $createHtmlNode({html: '<div>Test</div>', visibility});
                    const {element, type} = htmlNode.exportDOM({...exportOptions, target});
                    type.should.equal('inner');
                    element.innerHTML.should.equal('');
                }

                it('renders on web but not email if showOnWeb is true and showOnEmail is false', editorTest(function () {
                    const visibility = {showOnEmail: false, showOnWeb: true, segment: ''};
                    testWebRender(visibility);
                    testBlankRender(visibility, 'email');
                }));

                it('renders on email and not web if showOnEmail is true and showOnWeb is false', editorTest(function () {
                    const visibility = {showOnEmail: true, showOnWeb: false, segment: ''};
                    testEmailRender(visibility);
                    testBlankRender(visibility, 'web');
                }));

                it('renders both on web and email if showOnEmail and showOnWeb are true', editorTest(function () {
                    const visibility = {showOnEmail: true, showOnWeb: true, segment: ''};
                    testWebRender(visibility);
                    testEmailRender(visibility);
                }));
            });

            describe('with new visibility settings', function () {
                function testWebRender(visibility, expectedGateParams) {
                    const htmlNode = $createHtmlNode({html: '<div>Test</div>', visibility});
                    const {element, type} = htmlNode.exportDOM(exportOptions);
                    type.should.equal('value');
                    const baseExpectedContents = '\n<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->\n';
                    element.value.should.equal(expectedGateParams ? `\n<!--kg-gated-block:begin ${expectedGateParams} -->${baseExpectedContents}<!--kg-gated-block:end-->\n` : baseExpectedContents);
                }

                function testEmailRender(visibility, expectedSegment) {
                    const htmlNode = $createHtmlNode({html: '<div>Test</div>', visibility});
                    const {element, type} = htmlNode.exportDOM({...exportOptions, target: 'email'});
                    const expectedContents = '<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->';

                    if (!expectedSegment) {
                        type.should.equal('value');
                        element.value.should.equal(`\n${expectedContents}\n`);
                    } else {
                        type.should.equal('html');
                        element.outerHTML.should.equal(`<div data-gh-segment="${expectedSegment}" class="kg-visibility-wrapper">\n${expectedContents}\n</div>`);
                    }
                }

                function testBlankRender(visibility, target) {
                    const htmlNode = $createHtmlNode({html: '<div>Test</div>', visibility});
                    const {element, type} = htmlNode.exportDOM({...exportOptions, target});
                    type.should.equal('inner');
                    element.innerHTML.should.equal('');
                }

                it('web: excludes gated wrapper when shown to everyone', editorTest(function () {
                    const visibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                    testWebRender(visibility, null);
                }));

                it('web: includes gated wrapper with member-only params', editorTest(function () {
                    const visibility = {web: {nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                    testWebRender(visibility, 'nonMember:false memberSegment:"status:free,status:-free"');
                }));

                it('web: includes gated wrapper with anonymous-only params', editorTest(function () {
                    const visibility = {web: {nonMember: true, memberSegment: ''}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                    testWebRender(visibility, 'nonMember:true memberSegment:""');
                }));

                it('email: excludes content when hidden from all members', editorTest(function () {
                    const visibility = {web: {nonMember: true, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: ''}};
                    testBlankRender(visibility, 'email');
                }));

                it('email: skips segment wrapper when sent to all members', editorTest(function () {
                    const visibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                    testWebRender(visibility);
                    testEmailRender(visibility, '');
                }));

                it('email: includes content with member segment wrapper', editorTest(function () {
                    const visibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: 'status:free'}};
                    testEmailRender(visibility, 'status:free');
                }));

                it('handles web-only (everyone)', editorTest(function () {
                    const visibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                    testWebRender(visibility);
                    testBlankRender(visibility, 'email');
                }));

                it('handles web-only (members-only)', editorTest(function () {
                    const visibility = {web: {nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                    testWebRender(visibility, 'nonMember:false memberSegment:"status:free,status:-free"');
                    testBlankRender(visibility, 'email');
                }));

                it('handles email-only (free members)', editorTest(function () {
                    const visibility = {web: {nonMember: false, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: 'status:free'}};
                    testBlankRender(visibility, 'web');
                    testEmailRender(visibility, 'status:free');
                }));

                it('handles visibility for no-one', editorTest(function () {
                    const visibility = {web: {nonMember: false, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                    testBlankRender(visibility, 'web');
                    testBlankRender(visibility, 'email');
                }));
            });
        });
    });

    describe('importDOM', function () {
        it('parses a html node', editorTest(function () {
            const document = createDocument(html`
                <span><!--kg-card-begin: html--><p>here's html</p><!--kg-card-end: html--></span>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(HtmlNode);
        }));

        it('parses html table', editorTest(function () {
            const document = createDocument(html`
                <table style="float:right"><tr><th>Month</th><th>Savings</th></tr><tr><td>January</td><td>$100</td></tr><tr><td>February</td><td>$80</td></tr></table>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(HtmlNode);
        }));

        it('parses table nested in another table', editorTest(function () {
            const document = createDocument(html`
                <table id="table1"><tr><th>title1</th><th>title2</th><th>title3</th></tr><tr><td id="nested"><table id="table2"><tr><td>cell1</td><td>cell2</td><td>cell3</td></tr></table></td><td>cell2</td><td>cell3</td></tr><tr><td>cell4</td><td>cell5</td><td>cell6</td></tr></table>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(HtmlNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const json = htmlNode.exportJSON();

            json.should.deepEqual({
                type: 'html',
                version: 1,
                html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
                visibility: {
                    web: {
                        nonMember: true,
                        memberSegment: 'status:free,status:-free'
                    },
                    email: {
                        memberSegment: 'status:free,status:-free'
                    }
                }
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'html',
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
                    const [htmlNode] = $getRoot().getChildren();

                    htmlNode.html.should.equal('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('updates old visibility format to new format', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'html',
                        html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
                        visibility: {
                            showOnEmail: true,
                            showOnWeb: true
                        }
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
                    const [htmlNode] = $getRoot().getChildren();

                    htmlNode.visibility.should.deepEqual({
                        showOnWeb: true,
                        showOnEmail: true,
                        web: {
                            nonMember: true,
                            memberSegment: 'status:free,status:-free'
                        },
                        email: {
                            memberSegment: 'status:free,status:-free'
                        }
                    });

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createHtmlNode();
            node.getTextContent().should.equal('');

            node.html = '<script>const test = true;</script>';

            node.getTextContent().should.equal('<script>const test = true;</script>\n\n');
        }));
    });

    describe('getIsVisibilityActive', function () {
        function testIsVisibilityActive(expected, visibility) {
            const node = $createHtmlNode();
            node.visibility = visibility;
            node.getIsVisibilityActive().should.equal(expected);
        }

        describe('with old visibility format', function () {
            it('returns false when both showOnEmail and showOnWeb are true and segment is blank', editorTest(function () {
                testIsVisibilityActive(false, {showOnEmail: true, showOnWeb: true, segment: ''});
            }));

            it('returns true when showOnEmail is false', editorTest(function () {
                testIsVisibilityActive(true, {showOnEmail: false, showOnWeb: true, segment: ''});
            }));

            it('returns true when showOnWeb is false', editorTest(function () {
                testIsVisibilityActive(true, {showOnEmail: true, showOnWeb: false, segment: ''});
            }));

            it('returns true when segment is not empty', editorTest(function () {
                testIsVisibilityActive(true, {showOnEmail: true, showOnWeb: true, segment: 'status:-free'});
            }));
        });

        describe('with new visibility format', function () {
            it('returns false when shown to everyone', editorTest(function () {
                testIsVisibilityActive(false, {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}});
            }));

            it('returns true when hidden on web for non-members', editorTest(function () {
                testIsVisibilityActive(true, {web: {nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}});
            }));

            it('returns true when hidden on web for members', editorTest(function () {
                testIsVisibilityActive(true, {web: {nonMember: true, memberSegment: 'status:free'}, email: {memberSegment: ALL_MEMBERS_SEGMENT}});
            }));

            it('returns true when hidden on email for all members', editorTest(function () {
                testIsVisibilityActive(true, {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ''}});
            }));

            it('returns true when hidden on email for some members', editorTest(function () {
                testIsVisibilityActive(true, {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: 'status:free'}});
            }));
        });
    });
});
