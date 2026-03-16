declare module '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom' {
    class DOMParser {
        constructor(builder: unknown, options: unknown);
        parse(element: unknown): unknown;
    }
    export default DOMParser;
}

declare module '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder' {
    class Builder {
        constructor();
    }
    export default Builder;
}

declare module '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/renderers/mobiledoc' {
    const mobiledocRenderer: {
        render(post: unknown, version: string): unknown;
    };
    export default mobiledocRenderer;
}

declare module '@tryghost/kg-parser-plugins' {
    interface ParserPluginOptions {
        createDocument?: (html: string) => Document;
        cleanBasicHtml?: (html: string) => string;
    }
    export function createParserPlugins(options?: Partial<ParserPluginOptions>): unknown[];
}
