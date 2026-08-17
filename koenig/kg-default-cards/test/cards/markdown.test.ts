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

        expect(serializer.serialize(card.render(opts))).toEqual('<h1 id="heading">HEADING</h1>\n<ul>\n<li>list</li>\n<li>items</li>\n</ul>\n');
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

        expect(serializer.serialize(card.render(opts))).toEqual('<h1 id="heading">HEADING</h1>\n<h2>Heading 2>');
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

        expect(serializer.serialize(card.render(opts))).toEqual('');
    });

    it('transforms urls absolute to relative', function () {
        const payload = {
            markdown: 'A link to [an internal post](http://127.0.0.1:2369/post)'
        };

        const transformed = card.absoluteToRelative!(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        expect((transformed.markdown as string))
            .toBe('A link to [an internal post](/post)');
    });

    it('transforms urls relative to absolute', function () {
        const payload = {
            markdown: 'A link to [an internal post](/post)'
        };

        const transformed = card.relativeToAbsolute!(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        expect((transformed.markdown as string))
            .toBe('A link to [an internal post](http://127.0.0.1:2369/post)');
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

            expect(serializer.serialize(card.render(opts))).toEqual('<h1 id="headerone">Header One</h1>\n');
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

            expect(serializer.serialize(card.render(opts))).toEqual('<h1 id="header-one">Header One</h1>\n');
        });
    });
});
