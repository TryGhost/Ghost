const {shouldRender} = require('./utils');

describe('Quotes', function () {
    it('aside', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Aside with ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"formatting","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"aside","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<aside>Aside with <strong>formatting</strong></aside>`
    }));
});
