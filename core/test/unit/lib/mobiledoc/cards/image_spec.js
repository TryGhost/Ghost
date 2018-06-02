const should = require('should');  // jshint ignore:line
const card = require('../../../../../server/lib/mobiledoc/cards/image');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Image card', function () {
    it('generates an image', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image"></figure>');
    });

    it('generates an image with caption', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png',
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<figure class="kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image"><figcaption>Test caption</figcaption></figure>');
    });

    describe('sizes', function () {
        it('standard', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    imageStyle: ''
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image"></figure>');
        });

        it('wide', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    imageStyle: 'wide'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image kg-image-wide"></figure>');
        });

        it('full', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    imageStyle: 'full'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image kg-image-full"></figure>');
        });
    });
});
