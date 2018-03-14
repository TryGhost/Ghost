var should = require('should'),  // jshint ignore:line
    card = require('../../../../../server/lib/mobiledoc/cards/image'),
    SimpleDom = require('simple-dom'),
    opts;

describe('Image card', function () {
    it('generates an image', function () {
        opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png'
            }
        };

        var serializer = new SimpleDom.HTMLSerializer([]);
        serializer.serialize(card.render(opts)).should.match('<figure><img src="https://www.ghost.org/image.png"></img></figure>');
    });

    it('generates an image with caption', function () {
        opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png',
                caption: 'Test caption'
            }
        };

        var serializer = new SimpleDom.HTMLSerializer([]);
        serializer.serialize(card.render(opts)).should.match('<figure><img src="https://www.ghost.org/image.png"></img><figcaption>Test caption</figcaption></figure>');
    });
});
