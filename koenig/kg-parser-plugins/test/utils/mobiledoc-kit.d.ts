// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MobiledocSection = Record<string, any>;

interface MobiledocSections {
    toArray(): MobiledocSection[];
}

interface MobiledocParseResult {
    sections: MobiledocSections;
}

interface MobiledocParser {
    parse(dom: Node): MobiledocParseResult;
}

declare module '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder' {
    const PostNodeBuilder: {default: new () => unknown};
    export = PostNodeBuilder;
}

declare module '@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom' {
    const DOMParser: {default: new (builder: unknown, options: {plugins: unknown}) => MobiledocParser};
    export = DOMParser;
}
