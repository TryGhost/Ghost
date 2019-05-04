const DOMParser = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom').default;
const Builder = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder').default;
const mobiledocRenderer = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/renderers/mobiledoc').default;
const {createParserPlugins} = require('@tryghost/kg-parser-plugins');
const {JSDOM} = require('jsdom');

module.exports.toMobiledoc = (html, options = {}) => {
    // 1. sanitize HTML
    // @TODO: what sanitisations are needed?
    let sanitizedHTML = html;

    // 2. Do something vaguely like loadPost
    // https://github.com/ErisDS/mobiledoc-kit/blob/master/src/js/editor/editor.js#L193

    // 2.a. Parse our HTML and convert to a DOM with same API as browser
    let dom = new JSDOM(`<body>${sanitizedHTML}</body>`);

    // 2.b. Use Mobiledoc-kit's own DOM Parser to convert the DOM into mobiledoc's internal format
    // We use our parser plugins by default, but this is extensible
    if (!options.plugins) {
        options.plugins = createParserPlugins({
            createDocument(html) {
                return (new JSDOM(html)).window.document;
            }
        });
    }
    let parser = new DOMParser(new Builder(), options);
    let post = parser.parse(dom.window.document.body);

    // 3. Do something vaguely like serializePost, to render the mobiledoc internal format as mobiledoc
    // https://github.com/ErisDS/mobiledoc-kit/blob/master/src/js/editor/editor.js#L567
    let mobiledoc = mobiledocRenderer.render(post, '0.3.1');

    return mobiledoc;
};
