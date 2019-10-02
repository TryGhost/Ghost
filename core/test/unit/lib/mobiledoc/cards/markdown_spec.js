const should = require('should');
const card = require('../../../../../server/lib/mobiledoc/cards/markdown');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Markdown card', function () {
    it('renders', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                markdown: '#HEADING\r\n- list\r\n- items'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: markdown--><h1 id="heading">HEADING</h1>\n<ul>\n<li>list</li>\n<li>items</li>\n</ul>\n<!--kg-card-end: markdown-->');
    });

    it('Accepts invalid HTML in markdown', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                markdown: '#HEADING\r\n<h2>Heading 2>'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: markdown--><h1 id="heading">HEADING</h1>\n<h2>Heading 2><!--kg-card-end: markdown-->');
    });

    it('Renders nothing when payload is undefined', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                markdown: undefined
            }
        };

        serializer.serialize(card.render(opts)).should.eql('');
    });

    it('[deprecated] version 1', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                markdown: '#HEADING\r\n- list\r\n- items'
            },
            options: {
                version: 1
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: markdown--><div class="kg-card-markdown"><h1 id="heading">HEADING</h1>\n<ul>\n<li>list</li>\n<li>items</li>\n</ul>\n</div><!--kg-card-end: markdown-->');
    });
});
