import '../utils/index.js';

import {JSDOM} from 'jsdom';
import {createParserPlugins} from '../../src/index.js';
import PostNodeBuilder from '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder';
import DOMParser from '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom';

const buildDOM = function (html: string) {
    // the <body> wrapper is needed to retain the first comment if `html` starts
    // with one, this matches general DOM Parsing behaviour so we should always
    // be careful to wrap content any time we're converting fragments
    return (new JSDOM(`<body>${html}</body>`)).window.document.body;
};

describe('parser-plugins: softReturn atom', function () {
    let builder: unknown, parser: MobiledocParser, plugins: unknown;

    before(function () {
        plugins = createParserPlugins({
            createDocument(html: string) {
                return (new JSDOM(html)).window.document;
            }
        });
    });

    beforeEach(function () {
        builder = new PostNodeBuilder.default();
        parser = new DOMParser.default(builder, {plugins});
    });

    afterEach(function () {
        builder = null;
        parser = null as unknown as typeof parser;
    });

    describe('fromBr', function () {
        it('parses br tag into atom', function () {
            const dom = buildDOM('<br />');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('markup-section');
            section.markers.head.name.should.equal('soft-return');
            section.markers.head.type.should.equal('atom');
            section.markers.head.value.should.equal('');
            section.markers.head.payload.should.deepEqual({});
        });
    });
});
