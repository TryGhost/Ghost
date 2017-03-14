var should  = require('should'),
    card    = require('../cards/hr'),
    SimpleDom   = require('simple-dom'),
    opts;

should = should;
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
