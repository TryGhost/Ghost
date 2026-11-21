import {$isDecoratorNode, DecoratorNode} from 'lexical';
import type {LexicalNode} from 'lexical';
import type {ExportDOMOutput} from '@tryghost/kg-default-nodes';
import type {RendererOptions} from '../types.js';

export type InlineExportableDecorator = DecoratorNode<unknown> & {
    exportDOM(editor: null, options: RendererOptions): ExportDOMOutput;
};

// Inline decorators render alongside text within a block. Only nodes with their own
// exportDOM qualify; Lexical's default relies on createDOM and a browser document.
export function $isInlineDecorator(node: LexicalNode): node is InlineExportableDecorator {
    return $isDecoratorNode(node) &&
        node.isInline() &&
        node.exportDOM !== DecoratorNode.prototype.exportDOM;
}
