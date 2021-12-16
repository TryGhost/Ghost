// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/header');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Header card', function () {
    it('renders', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                backgroundImageSrc: 'https://example.com/image.jpg',
                buttonEnabled: true,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                header: 'This is the header card',
                size: 'small',
                style: 'dark',
                subheader: 'hi'
            }
        };

        serializer.serialize(card.render(opts)).should.equal(`<div class="kg-header-card kg-width-full kg-size-small kg-style-dark" style="" data-kg-background-image="https://example.com/image.jpg"><h2 class="kg-header-card-header">This is the header card</h2><h3 class="kg-header-card-subheader">hi</h3><a href="https://example.com/" class="kg-header-card-button">The button</a></div>`);
    });

    it('renders nothing when header and subheader is undefined and the button is disabled', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                backgroundImageSrc: 'https://example.com/image.jpg',
                buttonEnabled: false,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                header: '',
                size: 'small',
                style: 'dark',
                subheader: ''
            }
        };

        serializer.serialize(card.render(opts)).should.match('');
    });

    it('renders a minimal header card', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                backgroundImageSrc: '',
                buttonEnabled: false,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                header: 'hi',
                size: 'small',
                style: 'dark',
                subheader: ''
            }
        };

        serializer.serialize(card.render(opts)).should.equal(`<div class="kg-header-card kg-width-full kg-size-small kg-style-dark" style="" data-kg-background-image=""><h2 class="kg-header-card-header">hi</h2></div>`);
    });

    it('transforms urls absolute to relative', function () {
        let payload = {
            backgroundImageSrc: 'http://127.0.0.1:2369/img.jpg',
            buttonUrl: 'http://127.0.0.1:2369/post',
            header: '<a href="http://127.0.0.1:2369/post"></a>',
            subheader: '<a href="http://127.0.0.1:2369/post"></a>'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.backgroundImageSrc.should.equal('/img.jpg');
        transformed.buttonUrl.should.equal('/post');
        transformed.header.should.equal('<a href="/post"></a>');
        transformed.subheader.should.equal('<a href="/post"></a>');
    });

    it('transforms urls relative to absolute', function () {
        let payload = {
            backgroundImageSrc: '/img.jpg',
            buttonUrl: '/post',
            header: '<a href="/post"></a>',
            subheader: '<a href="/post"></a>'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.backgroundImageSrc.should.equal('http://127.0.0.1:2369/img.jpg');
        transformed.buttonUrl.should.equal('http://127.0.0.1:2369/post');
        transformed.header.should.equal('<a href="http://127.0.0.1:2369/post"></a>');
        transformed.subheader.should.equal('<a href="http://127.0.0.1:2369/post"></a>');
    });

    it('transforms urls to transform-ready', function () {
        let payload = {
            backgroundImageSrc: 'http://127.0.0.1:2369/img.jpg',
            buttonUrl: 'http://127.0.0.1:2369/post',
            header: '<a href="http://127.0.0.1:2369/post"></a>',
            subheader: '<a href="http://127.0.0.1:2369/post"></a>'
        };

        const transformed = card.toTransformReady(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        transformed.backgroundImageSrc.should.equal('__GHOST_URL__/img.jpg');
        transformed.buttonUrl.should.equal('__GHOST_URL__/post');
        transformed.header.should.equal('<a href="__GHOST_URL__/post"></a>');
        transformed.subheader.should.equal('<a href="__GHOST_URL__/post"></a>');
    });
});
