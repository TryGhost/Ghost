declare module 'mobiledoc-dom-renderer' {
    interface RenderResult {
        result: {
            lastChild: unknown;
            removeChild(child: unknown): void;
        };
        teardown(): void;
    }
    class Renderer {
        constructor(options: unknown);
        render(mobiledoc: unknown): RenderResult;
    }
    export default Renderer;
}

declare module 'simple-dom' {
    class Document {
        createElement(tag: string): unknown;
        createComment(text: string): unknown;
        createDocumentFragment(): unknown;
        createTextNode(text: string): unknown;
        createRawHTMLSection(html: string): unknown;
    }
    class HTMLSerializer {
        constructor(voidMap: Record<string, boolean>);
        serialize(node: unknown): string;
        serializeChildren(node: unknown): string;
    }
    const voidMap: Record<string, boolean>;
    export {Document, HTMLSerializer, voidMap};
}
