import {LexicalNode} from 'lexical';
import {RendererOptions} from '../convert-to-html-string';

export type ExportChildren = (node: LexicalNode, options?: RendererOptions) => string;
export type ElementTransformer = {
    export: (node: LexicalNode, options: RendererOptions, exportChildren: ExportChildren) => string | null;
};

const elementTransformers: ElementTransformer[] = [
    require('./element/paragraph'),
    require('./element/heading'),
    require('./element/list'),
    require('./element/blockquote'),
    require('./element/aside')
];

export default elementTransformers;