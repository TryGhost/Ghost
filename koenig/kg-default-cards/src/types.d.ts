export interface SimpleDomDocument {
    createElement(tagName: string): SimpleDomNode;
    createTextNode(text: string): SimpleDomNode;
    createRawHTMLSection(html: string): SimpleDomNode;
    createComment(text: string): SimpleDomNode;
}

export interface SimpleDomNode {
    appendChild(child: SimpleDomNode): void;
    setAttribute(name: string, value: string | number): void;
    getAttribute(name: string): string | null;
    tagName: string;
}

export interface CardRenderOptions {
    target?: string;
    siteUrl?: string;
    itemUrl?: string;
    postUrl?: string;
    ghostVersion?: string;
    canTransformImage?: (src: string) => boolean;
    imageOptimization?: {
        srcsets?: boolean;
        contentImageSizes?: Record<string, { width: number }>;
        defaultMaxWidth?: number;
    };
}

export interface CardRenderEnv {
    dom: SimpleDomDocument;
}

export interface CardRenderArgs {
    payload: Record<string, unknown>;
    env: CardRenderEnv;
    options?: CardRenderOptions;
}

export interface UrlTransformOptions {
    siteUrl: string;
    itemUrl?: string;
    [key: string]: unknown;
}

export interface Card {
    name: string;
    type: string;
    config?: Record<string, unknown>;
    render(args: CardRenderArgs): SimpleDomNode;
    absoluteToRelative?(payload: Record<string, unknown>, options: UrlTransformOptions): Record<string, unknown>;
    relativeToAbsolute?(payload: Record<string, unknown>, options: UrlTransformOptions): Record<string, unknown>;
    toTransformReady?(payload: Record<string, unknown>, options: UrlTransformOptions): Record<string, unknown>;
}
