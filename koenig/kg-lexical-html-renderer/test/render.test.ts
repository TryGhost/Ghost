const {shouldRender} = require('./utils');
const {AtLinkNode, AtLinkSearchNode, ZWNJNode} = require('@tryghost/kg-default-nodes');

const Renderer = require('../build/LexicalHTMLRenderer').default;

describe('render()', function () {
    it('works with no options', async function () {
        const editorState = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"First paragraph","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Second paragraph","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;
        const renderer = new Renderer();

        const html = await renderer.render(editorState);

        html.should.eql(`<p>First paragraph</p><p>Second paragraph</p>`);
    });

    it('escapes text content', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"<test>","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: '<p>&lt;test&gt;</p>'
    }));

    it('removes a trailing empty paragraph if present', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: ''
    }));

    it('removes a trailing paragraph with only whitespace if present', shouldRender({
        input: `{"root":{"children":[{"children":[{"type":"linebreak","version":1}],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: ''
    }));
});

describe('Special elements', function () {
    it('linebreak', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"First line","type":"text","version":1},{"type":"linebreak","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":"Second line","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p>First line<br>Second line</p>`
    }));

    it('multiple linebreaks', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"One","type":"text","version":1},{"type":"linebreak","version":1},{"type":"linebreak","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":"Two","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p>One<br><br>Two</p>`
    }));

    it('multiple linebreaks fully wrapped with formats', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"One","type":"text","version":1},{"type":"linebreak","version":1},{"type":"linebreak","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"Two","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>One<br><br>Two</strong></p>`
    }));

    it('multiple linebreaks surrounded by formats', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"One","type":"text","version":1},{"type":"linebreak","version":1},{"type":"linebreak","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":"Two","type":"text","version":1},{"type":"linebreak","version":1},{"type":"linebreak","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"Three","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>One</strong><br><br>Two<br><br><strong>Three</strong></p>`
    }));

    it('linebreaks with links', shouldRender ({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Test","type":"text","version":1},{"type":"linebreak","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"a link","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":null,"target":null,"title":null,"url":"https://ghost.org"},{"detail":0,"format":0,"mode":"normal","style":"","text":" some text","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p>Test<br><a href="https://ghost.org">a link</a> some text</p>`
    }));

    it('multiple linebreaks with links', shouldRender ({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Test","type":"text","version":1},{"type":"linebreak","version":1},{"type":"linebreak","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"a link","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":null,"target":null,"title":null,"url":"https://ghost.org"},{"detail":0,"format":0,"mode":"normal","style":"","text":" some text","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p>Test<br><br><a href="https://ghost.org">a link</a> some text</p>`
    }));

    it('linebreaks after multiple formats', shouldRender ({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":3,"mode":"normal","style":"","text":"Test","type":"text","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":" test","type":"text","version":1},{"type":"linebreak","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong><em>Test</em></strong> test<br></p>`
    }));
});

describe('Unexpected input', function () {
    it('paragraphs with no children', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Testing Before","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Testing After","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p>Testing Before</p><p></p><p>Testing After</p>`
    }));
});

describe('Transforms',function () {
    it('removes AtLink nodes when rendering', shouldRender({
        options: {nodes: [AtLinkNode, AtLinkSearchNode, ZWNJNode]},
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Testing Before ","type":"text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"","type":"zwnj","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":"search","type":"at-link-search","version":1,"placeholder":null}],"direction":"ltr","format":"","indent":0,"type":"at-link","version":1,"linkFormat":0},{"detail":0,"format":0,"mode":"normal","style":"","text":" After","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: '<p>Testing Before After</p>'
    }));
});
