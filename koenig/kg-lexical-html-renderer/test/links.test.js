const {shouldRender} = require('./utils');

describe('Links', function () {
    it('a', shouldRender({
        input: `{"root":{"children":[{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"test","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":null,"target":null,"url":"https://example.com"}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><a href="https://example.com">test</a></p>`
    }));

    it('a > strong italic', shouldRender({
        input: `{"root":{"children":[{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"test ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"bold","type":"text","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":" ","type":"text","version":1},{"detail":0,"format":2,"mode":"normal","style":"","text":"italic","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":null,"target":null,"url":"https://example.com"}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: '<p><a href="https://example.com">test <strong>bold</strong> <em>italic</em></a></p>'
    }));

    it('a > strong > italic', shouldRender({
        input: `{"root":{"children":[{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"test ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"bold ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"bold+italic","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":null,"target":null,"url":"https://example.com"}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: '<p><a href="https://example.com">test <strong>bold <em>bold+italic</em></strong></a></p>'
    }));
});
