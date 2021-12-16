// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const {JSDOM} = require('jsdom');
const {createParserPlugins} = require('../../cjs/parser-plugins');
const PostNodeBuilder = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder').default;
const DOMParser = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom').default;

const buildDOM = function (html) {
    // the <body> wrapper is needed to retain the first comment if `html` starts
    // with one, this matches general DOM Parsing behaviour so we should always
    // be careful to wrap content any time we're converting fragments
    return (new JSDOM(`<body>${html}</body>`)).window.document.body;
};

describe('parser-plugins: header card', function () {
    let builder, parser, plugins;

    before(function () {
        plugins = createParserPlugins({
            createDocument(html) {
                return (new JSDOM(html)).window.document;
            }
        });
    });

    beforeEach(function () {
        builder = new PostNodeBuilder();
        parser = new DOMParser(builder, {plugins});
    });

    afterEach(function () {
        builder = null;
        parser = null;
    });

    describe('kgHeaderCardToCard', function () {
        it('parses header card divs into cards', function () {
            const dom = buildDOM('<div class="kg-header-card kg-width-full kg-size-small kg-style-invert" style="" data-kg-background-image="https://example.com/image.jpg"><h2 class="kg-header-card-header">This is the header card</h2><h3 class="kg-header-card-subheader">hi</h3><a href="https://example.com/" class="kg-header-card-button"><span>The button</span></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('header');
            section.payload.should.deepEqual({
                header: 'This is the header card',
                subheader: 'hi',
                buttonEnabled: true,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                backgroundImageSrc: 'https://example.com/image.jpg',
                size: 'small',
                style: 'invert'
            });
        });

        it('parses a minimal header card', function () {
            const dom = buildDOM(`<div class="kg-header-card kg-width-full kg-size-small kg-style-invert" style="" data-kg-background-image=""><h2 class="kg-header-card-header">hi</h2></div>`);
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('header');
            section.payload.should.deepEqual({
                backgroundImageSrc: '',
                buttonEnabled: false,
                buttonText: '',
                buttonUrl: '',
                header: 'hi',
                size: 'small',
                style: 'invert',
                subheader: ''
            });
        });

        it('handles arbitrary whitespace', function () {
            const dom = buildDOM(`
                <div class="kg-header-card kg-width-full kg-size-small kg-style-invert" style="" data-kg-background-image=" https://example.com/image.jpg ">
                    <h2 class="kg-header-card-header">
                        This is the header card
                    </h2>
                    <h3 class="kg-header-card-subheader">
                        hi
                    </h3>
                    <a href="https://example.com/" class="kg-header-card-button">
                        <span>
                            The button
                        </span>
                    </a>
                </div>
            `);
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('header');
            section.payload.should.deepEqual({
                header: 'This is the header card',
                subheader: 'hi',
                buttonEnabled: true,
                buttonText: 'The button',
                buttonUrl: 'https://example.com/',
                backgroundImageSrc: 'https://example.com/image.jpg',
                size: 'small',
                style: 'invert'
            });
        });

        it('falls through if the header, subheader and button are missing', function () {
            const dom = buildDOM(`
                <div class="kg-header-card kg-width-full kg-size-small kg-style-invert" style="" data-kg-background-image=" https://example.com/image.jpg ">
                    <h2 class="kg-header-card-header">
                    </h2>
                    <h3 class="kg-header-card-subheader">
                    </h3>
                    <a href="" class="kg-header-card-button"><span>Test</span></a>
                </div>
            `);
            const sections = parser.parse(dom).sections.toArray();

            sections.length.should.equal(1);
            sections[0].type.should.equal('markup-section');
            sections[0].markers.head.value.should.equal('');
            sections[0].markers.head.next.value.should.equal('Test');
            sections[0].markers.head.next.markups[0].tagName.should.equal('a');
            sections[0].markers.head.next.markups[0].attributes.href.should.equal('');
        });
    });
});
