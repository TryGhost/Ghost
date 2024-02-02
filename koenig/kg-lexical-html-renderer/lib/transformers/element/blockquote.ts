import {$isQuoteNode} from '@lexical/rich-text';
import type {LexicalNode} from 'lexical';
import type {ExportChildren} from '..';
import type {RendererOptions} from '../../convert-to-html-string';

module.exports = {
    export(node: LexicalNode, options: RendererOptions, exportChildren: ExportChildren) {
        if (!$isQuoteNode(node)) {
            return null;
        }

        return `<blockquote>${exportChildren(node)}</blockquote>`;
    }
};
