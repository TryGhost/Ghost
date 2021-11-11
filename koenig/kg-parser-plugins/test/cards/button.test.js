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

        it('falls through if text is missing', function () {
            const dom = buildDOM(`
                <div class="kg-button-card">
                    <a href="https://example.com" class="kg-btn kg-btn-accent"></a>
                </div>
            `);
            const sections = parser.parse(dom).sections.toArray();

            sections.length.should.equal(0);
        });

        it('falls through if URL is missing', function () {
            const dom = buildDOM(`
                <div class="kg-button-card">
                    <a href="" class="kg-btn kg-btn-accent">Test</a>
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

    describe('wordpressButtonToCard', function () {
        it('parses button into card', function () {
            const dom = buildDOM(`
                <div class="wp-block-buttons">
                    <div class="wp-block-button">
                        <a href="https://example.com" class="wp-block-button__link">
                            Testing  button
                        </a>
                    </div>
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

        it('handles center alignment', function () {
            const dom = buildDOM(`
                <div class="wp-block-buttons is-content-justification-center">
                    <div class="wp-block-button">
                        <a href="https://example.com" class="wp-block-button__link">
                            Testing  button
                        </a>
                    </div>
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

        it('handles right alignment', function () {
            const dom = buildDOM(`
                <div class="wp-block-buttons is-content-justification-right">
                    <div class="wp-block-button">
                        <a href="https://example.com" class="wp-block-button__link">
                            Testing  button
                        </a>
                    </div>
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

        it('handles multiple buttons in a block', function () {
            const dom = buildDOM(`
                <div class="wp-block-buttons">
                    <div class="wp-block-button">
                        <a href="https://example.com/1" class="wp-block-button__link">
                            Button 1
                        </a>
                    </div>
                    <div class="wp-block-button">
                        <a href="https://example.com/2" class="wp-block-button__link">
                            Button 2
                        </a>
                    </div>
                </div>
            `);
            const sections = parser.parse(dom).sections.toArray();

            sections.length.should.equal(2);

            sections[0].type.should.equal('card-section');
            sections[0].name.should.equal('button');
            sections[0].payload.should.deepEqual({
                buttonUrl: 'https://example.com/1',
                buttonText: 'Button 1',
                alignment: 'left'
            });

            sections[1].type.should.equal('card-section');
            sections[1].name.should.equal('button');
            sections[1].payload.should.deepEqual({
                buttonUrl: 'https://example.com/2',
                buttonText: 'Button 2',
                alignment: 'left'
            });
        });

        it('falls through if text is missing', function () {
            const dom = buildDOM(`
                <div class="wp-block-buttons is-content-justification-right">
                    <div class="wp-block-button">
                        <a href="https://example.com" class="wp-block-button__link"></a>
                    </div>
                </div>
            `);
            const sections = parser.parse(dom).sections.toArray();

            sections.length.should.equal(0);
        });

        it('falls through if URL is missing', function () {
            const dom = buildDOM(`
                <div class="wp-block-buttons is-content-justification-right">
                    <div class="wp-block-button">
                        <a href="" class="wp-block-button__link">Test</a>
                    </div>
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
