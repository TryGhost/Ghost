// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const {JSDOM} = require('jsdom');
const {createParserPlugins} = require('../../');
const PostNodeBuilder = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder').default;
const DOMParser = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom').default;

const buildDOM = function (html) {
    // the <body> wrapper is needed to retain the first comment if `html` starts
    // with one, this matches general DOM Parsing behaviour so we should always
    // be careful to wrap content any time we're converting fragments
    return (new JSDOM(`<body>${html}</body>`)).window.document.body;
};

describe('parser-plugins: html card', function () {
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

    describe('kgHtmlCardToCard', function () {
        it('parses html wrapped in html card comments into card code', function () {
            const dom = buildDOM('<!--kg-card-begin: html--><div><span>Custom HTML</span></div><!--kg-card-end: html-->');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('html');
            section.payload.html.should.equal('<div><span>Custom HTML</span></div>');
        });

        it('skips other parser plugins', function () {
            const dom = buildDOM('<!--kg-card-begin: html--><img src="http://example.com/image.png"><!--kg-card-end: html-->');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('html');
            section.payload.html.should.equal('<img src="http://example.com/image.png">');
        });

        it('works with surrounding content', function () {
            const dom = buildDOM('<p>One</p>\n<!--kg-card-begin: html-->\n<img src="http://example.com/image.png">\n<!--kg-card-end: html-->\n<p><img src="http://example.com/image2.png"></p>');
            const sections = parser.parse(dom).sections.toArray();
            sections.length.should.equal(3);

            const [p, html, image] = sections;

            p.type.should.equal('markup-section');
            p.markers.head.value.should.equal('One');

            html.type.should.equal('card-section');
            html.name.should.equal('html');
            html.payload.html.should.equal('<img src="http://example.com/image.png">');

            image.type.should.equal('card-section');
            image.name.should.equal('image');
            image.payload.src.should.equal('http://example.com/image2.png');
        });
    });
});
