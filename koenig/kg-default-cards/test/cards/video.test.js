// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/video');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Video card', function () {
    it('renders', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://example.com/video.mp4',
                width: 640,
                height: 480,
                thumbnailSrc: 'https://example.com/video.png'
            }
        };

        serializer.serialize(card.render(opts)).should.equal('<figure class="kg-card kg-video-card"><video src="https://example.com/video.mp4" poster="https://img.spacergif.org/v1/640x480/0a/spacer.png" width="640" height="480" controls preload="metadata" style="background: transparent url(\'https://example.com/video.png\') 50% 50% / cover no-repeat;" /></video></figure>');
    });

    it('renders for email target', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://example.com/video.mp4',
                width: 640,
                height: 480,
                thumbnailSrc: 'https://example.com/video.png'
            },
            options: {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            }
        };

        let output = serializer.serialize(card.render(opts));
        output.should.not.containEql('<video');
        output.should.containEql('<figure class="kg-card kg-video-card"');
        output.should.containEql('<a class="kg-video-preview" href="https://example.com/my-post"');
        output.should.containEql('background="https://example.com/video.png"');
    });

    it('renders nothing when src is undefined', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: undefined
            }
        };

        serializer.serialize(card.render(opts)).should.match('');
    });

    it('renders card width', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://example.com/video.mp4',
                width: 640,
                height: 480,
                thumbnailSrc: 'https://example.com/video.png',
                cardWidth: 'wide'
            }
        };

        serializer.serialize(card.render(opts)).should.containEql('kg-card kg-video-card kg-width-wide');
    });

    it('renders loop attribute', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://example.com/video.mp4',
                width: 640,
                height: 480,
                loop: true,
                thumbnailSrc: 'https://example.com/video.png',
                cardWidth: 'wide'
            }
        };

        serializer.serialize(card.render(opts)).should.containEql(' loop ');
    });

    it('renders caption when provided', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://example.com/video.mp4',
                caption: '<strong>Caption</strong>'
            }
        };

        const output = serializer.serialize(card.render(opts));
        output.should.containEql('<figure class="kg-card kg-video-card kg-card-hascaption"');
        output.should.containEql('<figcaption><strong>Caption</strong></figcaption>');
    });

    it('transforms urls absolute to relative', function () {
        let payload = {
            src: 'http://127.0.0.1:2369/video.mp4',
            thumbnailSrc: 'http://127.0.0.1:2369/video.png',
            customThumbnailSrc: 'http://127.0.0.1:2369/custom.png',
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.src.should.equal('/video.mp4');
        transformed.thumbnailSrc.should.equal('/video.png');
        transformed.customThumbnailSrc.should.equal('/custom.png');
        transformed.caption
            .should.equal('A link to <a href="/post">an internal post</a>');
    });

    it('transforms urls relative to absolute', function () {
        let payload = {
            src: '/video.mp4',
            thumbnailSrc: '/video.png',
            customThumbnailSrc: '/custom.png',
            caption: 'A link to <a href="/post">an internal post</a>'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'http://127.0.0.1:2369/', itemUrl: 'http://127.0.0.1:2369/post'});

        transformed.src.should.equal('http://127.0.0.1:2369/video.mp4');
        transformed.thumbnailSrc.should.equal('http://127.0.0.1:2369/video.png');
        transformed.customThumbnailSrc.should.equal('http://127.0.0.1:2369/custom.png');
        transformed.caption
            .should.equal('A link to <a href="http://127.0.0.1:2369/post">an internal post</a>');
    });

    it('transforms urls to transform-ready', function () {
        let payload = {
            src: 'http://127.0.0.1:2369/video.mp4',
            thumbnailSrc: 'http://127.0.0.1:2369/video.png',
            customThumbnailSrc: 'http://127.0.0.1:2369/custom.png',
            caption: 'A link to <a href="http://127.0.0.1:2369/post">an internal post</a>'
        };

        const transformed = card.toTransformReady(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.src.should.equal('__GHOST_URL__/video.mp4');
        transformed.thumbnailSrc.should.equal('__GHOST_URL__/video.png');
        transformed.customThumbnailSrc.should.equal('__GHOST_URL__/custom.png');
        transformed.caption
            .should.equal('A link to <a href="__GHOST_URL__/post">an internal post</a>');
    });
});
