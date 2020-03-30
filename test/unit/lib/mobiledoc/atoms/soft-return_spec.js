const should = require('should');
const atom = require('../../../../../core/server/lib/mobiledoc/atoms/soft-return');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Soft return atom', function () {
    it('generates a `br` tag', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            }
        };

        serializer.serialize(atom.render(opts)).should.match('<br>');
    });
});
