var should = require('should'), // jshint ignore:line
    card = require('../../../../../server/lib/mobiledoc/cards/hr'),
    SimpleDom = require('simple-dom'),
    opts;

describe('HR card', function () {
    it('generates a horizontal rule', function () {
        opts = {
            env: {
                dom: new SimpleDom.Document()
            }
        };

        var serializer = new SimpleDom.HTMLSerializer([]);
        serializer.serialize(card.render(opts)).should.match('<hr></hr>');
    });
});
