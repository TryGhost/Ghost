const should = require('should');
const card = require('../../../../../server/lib/mobiledoc/cards/embed');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Embed card', function () {
    it('Embed Card renders', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                html: '<h1>HEADING</h1><p>PARAGRAPH</p>'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-embed-card"><h1>HEADING</h1><p>PARAGRAPH</p></figure>');
    });

    it('Plain content renders', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                html: 'CONTENT'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-embed-card">CONTENT</figure>');
    });

    it('Invalid HTML returns', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                html: '<h1>HEADING<'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-embed-card"><h1>HEADING<</figure>');
    });

    it('Renders nothing when payload is undefined', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                html: undefined
            }
        };

        serializer.serialize(card.render(opts)).should.match('');
    });

    it('Renders caption when provided', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                html: 'Testing',
                caption: '<strong>Caption</strong>'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-embed-card">Testing<figcaption><strong>Caption</strong></figcaption></figure>');
    });
});
