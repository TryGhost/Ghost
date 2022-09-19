const {shouldRender} = require('./utils');

describe('Horizontal rules', function () {
    it('horizontalrule', shouldRender({
        input: `{"root":{"children":[{"type":"horizontalrule","version":1},{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`,
        output: '<hr>\n<p></p>'
    }));
});
