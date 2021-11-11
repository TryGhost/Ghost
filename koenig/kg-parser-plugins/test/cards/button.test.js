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

describe('parser-plugins: button card', function () {
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

    describe('kgButtonCardToCard', function () {
        it('parses button card divs into cards', function () {
            const dom = buildDOM('<div class="kg-button-card"><a href="https://example.com" class="kg-btn kg-btn-accent">Testing button</a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('button');
            section.payload.should.deepEqual({
                // HTMLAnchorElement.href is a stringifier returing a full url
                // which is why the trailing slash has been appended
                buttonUrl: 'https://example.com/',
                buttonText: 'Testing button',
                alignment: 'left'
            });
        });

        it('parses center alignment class into payload', function () {
            const dom = buildDOM(`
                <div class="kg-button-card kg-align-center">
                    <a href="https://example.com" class="kg-btn kg-btn-accent">
                        Testing  button
                    </a>
                </div>
            `);
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('button');
            section.payload.should.deepEqual({
                buttonUrl: 'https://example.com/',
                buttonText: 'Testing button',
                alignment: 'center'
            });
        });

        it('handles arbitrary whitespace in button content', function () {
            const dom = buildDOM(`
                <div class="kg-button-card">
                    <a href="https://example.com" class="kg-btn kg-btn-accent">
                        Testing  button
                    </a>
                </div>
            `);
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('button');
            section.payload.should.deepEqual({
                buttonUrl: 'https://example.com/',
                buttonText: 'Testing button',
                alignment: 'left'
            });
        });
    });
});
