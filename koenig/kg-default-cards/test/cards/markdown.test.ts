import '../utils/index.js';

import card from '../../src/cards/markdown.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('Markdown card', function () {
    it('renders', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                markdown: '#HEADING\r\n- list\r\n- items'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<h1 id="heading">HEADING</h1>\n<ul>\n<li>list</li>\n<li>items</li>\n</ul>\n');
    });

    it('Accepts invalid HTML in markdown', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                markdown: '#HEADING\r\n<h2>Heading 2>'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<h1 id="heading">HEADING</h1>\n<h2>Heading 2>');
    });

    it('Renders nothing when payload is undefined', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                markdown: undefined
            }
        };

        serializer.serialize(card.render(opts)).should.eql('');
    });

    it('transforms urls absolute to relative', function () {
        const payload = {
            markdown: 'A link to [an internal post](http://127.0.0.1:2369/post)'
        };

        const transformed = card.absoluteToRelative!(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        (transformed.markdown as string)
            .should.equal('A link to [an internal post](/post)');
    });

    it('transforms urls relative to absolute', function () {
        const payload = {
            markdown: 'A link to [an internal post](/post)'
        };

        const transformed = card.relativeToAbsolute!(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        (transformed.markdown as string)
            .should.equal('A link to [an internal post](http://127.0.0.1:2369/post)');
    });

    describe('ghostVersion', function () {
        it('3.0', function () {
            const opts = {
                env: {
                    dom: new SimpleDomDocument()
                },
                payload: {
                    markdown: '# Header One'
                },
                options: {
                    ghostVersion: '3.0'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<h1 id="headerone">Header One</h1>\n');
        });

        it('4.0', function () {
            const opts = {
                env: {
                    dom: new SimpleDomDocument()
                },
                payload: {
                    markdown: '# Header One'
                },
                options: {
                    ghostVersion: '4.0'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<h1 id="header-one">Header One</h1>\n');
        });
    });
});
