// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const Renderer = require('../');

describe('Rendering', function () {
    it('can render with no options', function () {
        const editorState = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"First paragraph","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Second paragraph","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;
        const renderer = new Renderer();

        const html = renderer.render(editorState);

        html.should.eql(`<p>First paragraph</p>
<p>Second paragraph</p>`);
    });
});
