export type ExportDOMOutputType = 'inner' | 'outer' | 'value' | 'html';

export interface ExportDOMOutput<TElement extends Element | null = Element | null, TType extends ExportDOMOutputType = ExportDOMOutputType> {
    element: TElement;
    type: TType;
}

export interface ExportDOMFeatureOptions {
    emailCustomization?: boolean;
    emailCustomizationAlpha?: boolean;
    [key: string]: unknown;
}

export interface ExportDOMDom {
    window: {document: Document};
}

export interface ExportDOMOptionsBase {
    createDocument?: () => Document;
    dom?: ExportDOMDom;
    target?: string;
    postUrl?: string;
    siteUrl?: string;
    siteUuid?: string;
    canTransformImage?: (src: string) => boolean;
    imageOptimization?: Record<string, unknown>;
    feature?: ExportDOMFeatureOptions;
    design?: Record<string, unknown>;
    [key: string]: unknown;
}

export type ExportDOMRenderer<TNode = unknown, TOptions extends ExportDOMOptionsBase = ExportDOMOptionsBase, TOutput extends ExportDOMOutput = ExportDOMOutput> = (node: TNode, options: TOptions) => TOutput;

export type VersionedExportDOMRenderer<TNode = unknown, TOptions extends ExportDOMOptionsBase = ExportDOMOptionsBase, TOutput extends ExportDOMOutput = ExportDOMOutput> = Record<string | number, ExportDOMRenderer<TNode, TOptions, TOutput>>;

export type ExportDOMNodeRenderers<TNode = unknown, TOptions extends ExportDOMOptionsBase = ExportDOMOptionsBase, TOutput extends ExportDOMOutput = ExportDOMOutput> = Record<string, ExportDOMRenderer<TNode, TOptions, TOutput> | VersionedExportDOMRenderer<TNode, TOptions, TOutput>>;

export interface ExportDOMOptions extends ExportDOMOptionsBase {
    nodeRenderers?: ExportDOMNodeRenderers;
}
