import {ElementNode} from 'lexical';
import type {RendererOptions} from '@tryghost/kg-default-nodes';

export type ExportChildren = (node: ElementNode, options?: RendererOptions) => string;
export type ElementTransformer = {
    export: (node: ElementNode, options: RendererOptions, exportChildren: ExportChildren) => string | null;
};

const elementTransformers: ElementTransformer[] = [
    require('./element/paragraph'),
    require('./element/heading'),
    require('./element/list'),
    require('./element/blockquote'),
    require('./element/aside')
];

export default elementTransformers;
