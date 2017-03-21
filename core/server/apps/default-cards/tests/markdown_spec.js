var should = require('should'),  // jshint ignore:line
    card = require('../cards/markdown'),
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
        serializer.serialize(card.render(opts)).should.match('<div><h1 id="heading">HEADING</h1>\n\n<ul>\n<li>list</li>\n<li>items</li>\n</ul></div>');
    });
});
