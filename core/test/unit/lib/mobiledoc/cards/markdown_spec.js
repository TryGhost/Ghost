var should = require('should'),  // jshint ignore:line
    card = require('../../../../../server/lib/mobiledoc/cards/markdown'),
    SimpleDom = require('simple-dom'),
    opts;

describe('Markdown card', function () {
    it('Markdown Card renders', function () {
        opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                markdown: '#HEADING\r\n- list\r\n- items'
            }
        };

        var serializer = new SimpleDom.HTMLSerializer([]);
        serializer.serialize(card.render(opts)).should.match('<div class="kg-card-markdown"><h1 id="heading">HEADING</h1>\n<ul>\n<li>list</li>\n<li>items</li>\n</ul>\n</div>');
    });

    it('Accepts invalid HTML in markdown', function () {
        opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                markdown: '#HEADING\r\n<h2>Heading 2>'
            }
        };

        var serializer = new SimpleDom.HTMLSerializer([]);
        serializer.serialize(card.render(opts)).should.match('<div class="kg-card-markdown"><h1 id="heading">HEADING</h1>\n<h2>Heading 2></div>');
    });
});
