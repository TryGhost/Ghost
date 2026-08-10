import card from '../../src/cards/header.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('Header card', function () {
    it('renders', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
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

        expect(serializer.serialize(card.render(opts))).toBe(`<div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-dark" style="" data-kg-background-image="https://example.com/image.jpg"><h2 class="kg-header-card-header" id="this-is-the-header-card">This is the header card</h2><h3 class="kg-header-card-subheader" id="hi">hi</h3><a href="https://example.com/" class="kg-header-card-button">The button</a></div>`);
    });

    it('renders nothing when header and subheader is undefined and the button is disabled', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                backgroundImageSrc: 'https://example.com/image.jpg',
                buttonEnabled: false,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                header: null,
                size: 'small',
                style: 'dark',
                subheader: null
            }
        };

        expect(serializer.serialize(card.render(opts))).toEqual('');
    });

    it('renders a minimal header card', function () {
        const opts = {
            env: {
                dom: new SimpleDomDocument()
            },
            payload: {
                backgroundImageSrc: '',
                buttonEnabled: false,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                header: 'hi',
                size: 'small',
                style: 'dark',
                subheader: null
            }
        };

        expect(serializer.serialize(card.render(opts))).toBe(`<div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-dark" style="" data-kg-background-image=""><h2 class="kg-header-card-header" id="hi">hi</h2></div>`);
    });

    it('transforms urls absolute to relative', function () {
        const payload = {
            backgroundImageSrc: 'http://127.0.0.1:2369/img.jpg',
            buttonUrl: 'http://127.0.0.1:2369/post',
            header: '<a href="http://127.0.0.1:2369/post"></a>',
            subheader: '<a href="http://127.0.0.1:2369/post"></a>'
        };

        const transformed = card.absoluteToRelative!(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        expect((transformed.backgroundImageSrc as string)).toBe('/img.jpg');
        expect((transformed.buttonUrl as string)).toBe('/post');
        expect((transformed.header as string)).toBe('<a href="/post"></a>');
        expect((transformed.subheader as string)).toBe('<a href="/post"></a>');
    });

    it('transforms urls relative to absolute', function () {
        const payload = {
            backgroundImageSrc: '/img.jpg',
            buttonUrl: '/post',
            header: '<a href="/post"></a>',
            subheader: '<a href="/post"></a>'
        };

        const transformed = card.relativeToAbsolute!(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        expect((transformed.backgroundImageSrc as string)).toBe('http://127.0.0.1:2369/img.jpg');
        expect((transformed.buttonUrl as string)).toBe('http://127.0.0.1:2369/post');
        expect((transformed.header as string)).toBe('<a href="http://127.0.0.1:2369/post"></a>');
        expect((transformed.subheader as string)).toBe('<a href="http://127.0.0.1:2369/post"></a>');
    });

    it('transforms urls to transform-ready', function () {
        const payload = {
            backgroundImageSrc: 'http://127.0.0.1:2369/img.jpg',
            buttonUrl: 'http://127.0.0.1:2369/post',
            header: '<a href="http://127.0.0.1:2369/post"></a>',
            subheader: '<a href="http://127.0.0.1:2369/post"></a>'
        };

        const transformed = card.toTransformReady!(payload, {siteUrl: 'http://127.0.0.1:2369/'});

        expect((transformed.backgroundImageSrc as string)).toBe('__GHOST_URL__/img.jpg');
        expect((transformed.buttonUrl as string)).toBe('__GHOST_URL__/post');
        expect((transformed.header as string)).toBe('<a href="__GHOST_URL__/post"></a>');
        expect((transformed.subheader as string)).toBe('<a href="__GHOST_URL__/post"></a>');
    });
});
