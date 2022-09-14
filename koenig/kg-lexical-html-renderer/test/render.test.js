// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const Renderer = require('../');

function shouldRender({input, output}) {
    return function () {
        const renderer = new Renderer();
        renderer.render(input).should.equal(output);
    };
}
describe('render()', function () {
    it('works with no options', function () {
        const editorState = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"First paragraph","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Second paragraph","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;
        const renderer = new Renderer();

        const html = renderer.render(editorState);

        html.should.eql(`<p>First paragraph</p>
<p>Second paragraph</p>`);
    });

    it('escapes text content', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"<test>","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: '<p>&lt;test&gt;</p>'
    }));
});

describe('Special elements', function () {
    it('linebreak', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"First line","type":"text","version":1},{"type":"linebreak","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":"Second line","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p>First line<br>Second line</p>`
    }));
});
