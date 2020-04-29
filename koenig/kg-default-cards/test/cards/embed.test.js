// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/embed');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Embed card', function () {
    it('renders', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                html: '<h1>HEADING</h1><p>PARAGRAPH</p>'
            }
        };

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-embed-card"><h1>HEADING</h1><p>PARAGRAPH</p></figure>');
    });

    it('renders videos for email target', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
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

        let output = serializer.serialize(card.render(opts));
        output.should.not.match(/<h1>HEADING<\/h1>/);
        output.should.match(/<figure class="kg-card kg-embed-card"/);
        output.should.match(/<a class="kg-video-preview" href="https:\/\/example\.com\/my-video"/);
        output.should.match(/background="https:\/\/example\.com\/thumbnail\.png"/);
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

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-embed-card">CONTENT</figure>');
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

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-embed-card"><h1>HEADING<</figure>');
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

        serializer.serialize(card.render(opts)).should.match('<figure class="kg-card kg-embed-card kg-card-hascaption">Testing<figcaption><strong>Caption</strong></figcaption></figure>');
    });

    it('transforms urls absolute to relative', function () {
        let payload = {
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.caption
            .should.equal('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        let payload = {
            caption: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        transformed.caption
            .should.equal('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });
});
