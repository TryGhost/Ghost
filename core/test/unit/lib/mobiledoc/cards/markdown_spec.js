const should = require('should'); // jshint ignore:line
const card = require('../../../../../server/lib/mobiledoc/cards/markdown');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Markdown card', function () {
    describe('version 1', function () {
        it('Markdown Card renders', function () {
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

            serializer.serialize(card.render(opts)).should.match('<div class="kg-card-markdown"><h1 id="heading">HEADING</h1>\n<ul>\n<li>list</li>\n<li>items</li>\n</ul>\n</div>');
        });

        it('Accepts invalid HTML in markdown', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    markdown: '#HEADING\r\n<h2>Heading 2>'
                },
                options: {
                    version: 1
                }
            };

            serializer.serialize(card.render(opts)).should.match('<div class="kg-card-markdown"><h1 id="heading">HEADING</h1>\n<h2>Heading 2></div>');
        });
    });

    describe('version 2', function () {
        it('Markdown Card renders', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    markdown: '#HEADING\r\n- list\r\n- items'
                },
                options: {
                    version: 2
                }
            };

            serializer.serialize(card.render(opts)).should.match('<h1 id="heading">HEADING</h1>\n<ul>\n<li>list</li>\n<li>items</li>\n</ul>\n');
        });

        it('Accepts invalid HTML in markdown', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    markdown: '#HEADING\r\n<h2>Heading 2>'
                },
                options: {
                    version: 2
                }
            };

            serializer.serialize(card.render(opts)).should.match('<h1 id="heading">HEADING</h1>\n<h2>Heading 2>');
        });

        it('Renders nothing when payload is undefined', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    markdown: undefined
                },
                options: {
                    version: 2
                }
            };

            serializer.serialize(card.render(opts)).should.match('');
        });
    });
});
