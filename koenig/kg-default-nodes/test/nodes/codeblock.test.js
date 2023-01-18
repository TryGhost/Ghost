const {html} = require('../utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {CodeBlockNode, $createCodeBlockNode, $isCodeBlockNode} = require('../../');

const editorNodes = [CodeBlockNode];

describe('CodeBlockNode', function () {
    let editor;
    let code;
    let language;
    let caption;
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

        code = '<script></script>';
        language = 'javascript';
        caption = 'A code block';

        exportOptions = new Object({
            createDocument: () => {
                return (new JSDOM()).window.document;
            }
        });
    });

    it('matches node with $isCodeBlockNode', editorTest(function () {
        const codeBlockNode = $createCodeBlockNode({language, code, caption});
        $isCodeBlockNode(codeBlockNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({language, code, caption});

            codeBlockNode.getCode().should.equal('<script></script>');
            codeBlockNode.getLanguage().should.equal('javascript');
            codeBlockNode.getCaption().should.equal('A code block');
        }));

        it('has setters for all properties', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({language: '', code: '', caption: ''});

            codeBlockNode.getLanguage().should.equal('');
            codeBlockNode.setLanguage('javascript');
            codeBlockNode.getLanguage().should.equal('javascript');

            codeBlockNode.getCode().should.equal('');
            codeBlockNode.setCode('<script></script>');
            codeBlockNode.getCode().should.equal('<script></script>');

            codeBlockNode.getCaption().should.equal('');
            codeBlockNode.setCaption('A code block');
            codeBlockNode.getCaption().should.equal('A code block');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({language, code, caption});
            const codeBlockNodeDataset = codeBlockNode.getDataset();

            codeBlockNodeDataset.should.deepEqual({
                code: '<script></script>',
                language: 'javascript',
                caption: 'A code block'
            });
        }));
    });

    describe('exportDOM', function () {
        it('renders and escapes', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({code});
            const {element} = codeBlockNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
                <pre><code>&lt;script&gt;&lt;/script&gt;</code></pre>
            `);
        }));

        it('renders language class if provided', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({language, code});
            const {element} = codeBlockNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
                <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
            `);
        }));

        it('renders nothing when code is undefined or empty', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({code: ''});
            const {element} = codeBlockNode.exportDOM(exportOptions);

            element.textContent.should.equal('');
            should(element.outerHTML).be.undefined();
        }));

        it('renders a figure if a caption is provided', editorTest(function () {
            const codeBlockNode = $createCodeBlockNode({language, code, caption});
            const {element} = codeBlockNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
                <figure class="kg-card kg-code-card">
                    <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
                    <figcaption>A code block</figcaption>
                </figure>
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses PRE>CODE inside FIGURE into code card', editorTest(function () {
            const dom = (new JSDOM(html`
                <figure><pre><code>Test code</code></pre></figure>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].getCode().should.equal('Test code');
            should(nodes[0].getLanguage()).be.undefined();
            should(nodes[0].getCaption()).be.undefined();
        }));

        it('parses PRE>CODE inside FIGURE with FIGCAPTION into code card', editorTest(function () {
            const dom = (new JSDOM(html`
                <figure><pre><code>Test code</code></pre><figcaption>Test caption</figcaption></figure>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].getCode().should.equal('Test code');
            nodes[0].getCaption().should.equal('Test caption');
            should(nodes[0].getLanguage()).be.undefined();
        }));

        it('extracts language from pre class name for FIGURE>PRE>CODE', editorTest(function () {
            const dom = (new JSDOM(html`
                <figure><pre class="language-js"><code>Test code</code></pre><figcaption>Test caption</figcaption></figure>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].getCode().should.equal('Test code');
            nodes[0].getCaption().should.equal('Test caption');
            nodes[0].getLanguage().should.equal('js');
        }));

        it('extracts language from code class name for FIGURE>PRE>CODE', editorTest(function () {
            const dom = (new JSDOM(html`
                <figure><pre><code class="language-js">Test code</code></pre><figcaption>Test caption</figcaption></figure>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].getCode().should.equal('Test code');
            nodes[0].getCaption().should.equal('Test caption');
            nodes[0].getLanguage().should.equal('js');
        }));

        it('correctly skips if there is no pre tag', editorTest(function () {
            const dom = (new JSDOM(html`
                <figure><div><span class="nothing-to-see-here"></span></div></figure>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(0);
        }));

        it('parses PRE>CODE into code card', editorTest(function () {
            const dom = (new JSDOM(html`
                <figure><pre><code>Test code</code></pre></figure>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].getCode().should.equal('Test code');
            should(nodes[0].getLanguage()).be.undefined();
            should(nodes[0].getCaption()).be.undefined();
        }));

        it('extracts language from pre class name for PRE>CODE', editorTest(function () {
            const dom = (new JSDOM(html`
                <figure><pre class="language-javascript"><code>Test code</code></pre></figure>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].getCode().should.equal('Test code');
            nodes[0].getLanguage().should.equal('javascript');
            should(nodes[0].getCaption()).be.undefined();
        }));

        it('extracts language from code class name for PRE>CODE', editorTest(function () {
            const dom = (new JSDOM(html`
                <figure><pre><code class="language-ruby">Test code</code></pre></figure>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].getCode().should.equal('Test code');
            nodes[0].getLanguage().should.equal('ruby');
            should(nodes[0].getCaption()).be.undefined();
        }));
    });
});
