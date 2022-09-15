const should = require('should');
const lexicalLib = require('../../../../core/server/lib/lexical');

describe('lib/lexical', function () {
    describe('lexicalHtmlRenderer', function () {
        it('renders', function () {
            const lexical = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Lexical is ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"rendering.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

            lexicalLib.lexicalHtmlRenderer.render(lexical)
                .should.eql('<p>Lexical is <strong><em>rendering.</em></strong></p>');
        });
    });
});
