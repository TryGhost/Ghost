const should = require('should');
const card = require('../../../../../server/lib/mobiledoc/cards/hr');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('HR card', function () {
    it('generates a horizontal rule', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            }
        };

        serializer.serialize(card.render(opts)).should.match('<hr>');
    });

    it('transforms urls absolute to relative', function () {
        let payload = {};
        const transformed = card.absoluteToRelative(payload, {});
        transformed.should.deepEqual({});
    });

    it('transforms urls relative to absolute', function () {
        let payload = {};
        const transformed = card.relativeToAbsolute(payload, {});
        transformed.should.deepEqual({});
    });
});
