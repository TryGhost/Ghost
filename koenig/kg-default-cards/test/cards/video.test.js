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

        serializer.serialize(card.render(opts)).should.equal(`<figure class="kg-card kg-video-card"><video src="https://example.com/video.mp4" poster="https://img.spacergif.org/v1/640x480/0a/spacer.png" width="640" height="480" preload="metadata" style="background: transparent url('https://example.com/video.png') 50% 50% / cover no-repeat;" /></video><div class="kg-video-player-container"><div class="kg-video-player"><button class="kg-video-play-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"/></svg></button><button class="kg-video-pause-icon kg-video-hide"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"/><rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"/></svg></button><span class="kg-video-current-time">0:00</span><div class="kg-video-time">/<span class="kg-video-duration"></span></div><input type="range" class="kg-video-seek-slider" max="100" value="0"><button class="kg-video-playback-rate">1&#215;</button><button class="kg-video-unmute-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"/></svg></button><button class="kg-video-mute-icon kg-video-hide"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"/></svg></button><input type="range" class="kg-video-volume-slider" max="100" value="100"></div></div></figure>`);
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
