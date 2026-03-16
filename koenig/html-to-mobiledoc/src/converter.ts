import DOMParserModule from '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom';
import BuilderModule from '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder';
import mobiledocRendererModule from '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/renderers/mobiledoc';
import {createParserPlugins} from '@tryghost/kg-parser-plugins';
import {JSDOM} from 'jsdom';

// These modules may export via .default depending on the bundler/CJS interop
const DOMParser = (DOMParserModule as {default?: typeof DOMParserModule}).default || DOMParserModule;
const Builder = (BuilderModule as {default?: typeof BuilderModule}).default || BuilderModule;
const mobiledocRenderer = (mobiledocRendererModule as {default?: typeof mobiledocRendererModule}).default || mobiledocRendererModule;

interface ConvertOptions {
    plugins?: unknown[];
    [key: string]: unknown;
}

export interface Mobiledoc {
    version: string;
    atoms: object[];
    cards: object[];
    markups: object[];
    sections: object[];
}

export function htmlToMobiledoc(html: string, options: ConvertOptions = {}): Mobiledoc {
    // 1. sanitize HTML
    // @TODO: what sanitisations are needed?
    const sanitizedHTML = html;

    // 2. Do something vaguely like loadPost
    // https://github.com/ErisDS/mobiledoc-kit/blob/master/src/js/editor/editor.js#L193

    // 2.a. Parse our HTML and convert to a DOM with same API as browser
    const dom = new JSDOM(`<body>${sanitizedHTML}</body>`);

    // 2.b. Use Mobiledoc-kit's own DOM Parser to convert the DOM into mobiledoc's internal format
    // We use our parser plugins by default, but this is extensible
    if (!options.plugins) {
        options.plugins = createParserPlugins({
            createDocument(htmlToParse: string) {
                return (new JSDOM(htmlToParse)).window.document;
            }
        });
    }
    const parser = new DOMParser(new Builder(), options);
    const post = parser.parse(dom.window.document.body);
    // 3. Do something vaguely like serializePost, to render the mobiledoc internal format as mobiledoc
    // https://github.com/ErisDS/mobiledoc-kit/blob/master/src/js/editor/editor.js#L567
    const mobiledoc = mobiledocRenderer.render(post, '0.3.1') as Mobiledoc;
    return mobiledoc;
}
