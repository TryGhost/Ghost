const should = require('should');
const card = require('../../../../../server/lib/mobiledoc/cards/image');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Image card', function () {
    it('renders an image', function () {
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

    it('renders an image with caption', function () {
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

    it('renders nothing with no src', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: '',
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('');
    });

    describe('sizes', function () {
        it('standard', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    cardWidth: ''
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
                    cardWidth: 'wide'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-image-card kg-width-wide"><img src="https://www.ghost.org/image.png" class="kg-image"></figure>');
        });

        it('full', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    cardWidth: 'full'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<figure class="kg-image-card kg-width-full"><img src="https://www.ghost.org/image.png" class="kg-image"></figure>');
        });
    });
});
