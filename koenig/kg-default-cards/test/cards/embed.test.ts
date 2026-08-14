import should from 'should';
import '../utils/index.js';

import card from '../../src/cards/embed.js';
import {JSDOM} from 'jsdom';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('Embed card', function () {
    it('renders', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: '<h1>HEADING</h1><p>PARAGRAPH</p>'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-embed-card"><h1>HEADING</h1><p>PARAGRAPH</p></figure>');
    });

    it('renders videos for email target', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                type: 'video',
                html: '<h1>HEADING</h1><p>PARAGRAPH</p>',
                url: 'https://example.com/my-video',
                metadata: {
                    thumbnail_url: 'https://example.com/thumbnail.png',
                    thumbnail_width: 640,
                    thumbnail_height: 480
                }
            },
            options: {
                target: 'email'
            }
        };

        const output = serializer.serialize(card.render(opts));
        output.should.not.match(/<h1>HEADING<\/h1>/);
        output.should.match(/<figure class="kg-card kg-embed-card"/);
        output.should.match(/<a class="kg-video-preview" href="https:\/\/example\.com\/my-video"/);
        output.should.match(/background="https:\/\/example\.com\/thumbnail\.png"/);
    });

    it('Plain content renders', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: 'CONTENT'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-embed-card">CONTENT</figure>');
    });

    it('Invalid HTML returns', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: '<h1>HEADING<'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-embed-card"><h1>HEADING<</figure>');
    });

    it('Renders nothing when payload is undefined', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: undefined
            }
        };

        serializer.serialize(card.render(opts)).should.match('');
    });

    it('Renders caption when provided', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                html: 'Testing',
                caption: '<strong>Caption</strong>'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-embed-card kg-card-hascaption">Testing<figcaption><strong>Caption</strong></figcaption></figure>');
    });

    it('transforms urls absolute to relative', function () {
        const payload = {
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative!(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        (transformed.caption as string)
            .should.equal('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        const payload = {
            caption: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute!(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        (transformed.caption as string)
            .should.equal('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });

    it('renders nfts and escapes the JSON', function () {
        const payload = {
            type: 'nft',
            url: 'https://opensea.io/0x90bae7c0d86b2583d02c072d45bd64ace0b8db86/417',
            metadata: {
                image_url: '"test',
                title: 'This has double "quotes" & \'single\'.',
                author_name: '</span>test',
                nested: 'prop with "quotes"'
            },
            caption: 'Hello'
        };

        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload
        };

        const output = serializer.serialize(card.render(opts));

        const dom = new JSDOM(output);

        const parsedPayload = JSON.parse(decodeURIComponent((dom.window.document.body.querySelector('.kg-nft-card > a') as HTMLAnchorElement).dataset.payload!));

        parsedPayload.type.should.equal(payload.type);
        parsedPayload.url.should.equal(payload.url);
        parsedPayload.metadata.title.should.equal(payload.metadata.title);
        parsedPayload.metadata.nested.should.equal(payload.metadata.nested);
    });

    it('renders nfts in a table for email', function () {
        const payload = {
            type: 'nft',
            url: 'https://opensea.io/0x90bae7c0d86b2583d02c072d45bd64ace0b8db86/417',
            metadata: {
                image_url: '"test',
                title: 'This has double "quotes" & \'single\'.',
                author_name: '</span>test',
                nested: 'prop with "quotes"'
            },
            caption: 'Hello'
        };

        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload,
            options: {
                target: 'email'
            }
        };

        const output = serializer.serialize(card.render(opts));

        const dom = new JSDOM(output);

        should.exist(dom.window.document.body.querySelector('table'));
    });
});
