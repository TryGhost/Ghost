const should = require('should'); // jshint ignore:line
const card = require('../../../../../server/lib/mobiledoc/cards/html');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('HTML card', function () {
    it('HTML Card renders', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                html: '<h1>HEADING</h1><p>PARAGRAPH</p>'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<h1>HEADING</h1><p>PARAGRAPH</p>');
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

        serializer.serialize(card.render(opts)).should.match('CONTENT');
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

        serializer.serialize(card.render(opts)).should.match('<h1>HEADING<');
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
});
