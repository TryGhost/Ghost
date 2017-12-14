var should = require('should'), // jshint ignore:line
    card = require('../../../../../server/lib/mobiledoc/atoms/soft-return'),
    SimpleDom = require('simple-dom'),
    opts;

describe('Soft return card', function () {
    it('generates a `br` tag', function () {
        opts = {
            env: {
                dom: new SimpleDom.Document()
            }
        };

        var serializer = new SimpleDom.HTMLSerializer([]);
        serializer.serialize(card.render(opts)).should.match('<br></br>');
    });
});
