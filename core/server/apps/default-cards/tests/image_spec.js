var should  = require('should'),
    card    = require('../cards/image'),
    SimpleDom   = require('simple-dom'),
    opts;

should = should;
describe('Image card', function () {
    it('generates an image', function () {
        opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                img: 'https://www.ghost.org/image.png'
            }
        };

        var serializer = new SimpleDom.HTMLSerializer([]);
        serializer.serialize(card.render(opts)).should.match('<img src="https://www.ghost.org/image.png"></img>');
    });
});
