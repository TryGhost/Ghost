import {$isQuoteNode} from '@lexical/rich-text';
import type {RendererOptions} from '@tryghost/kg-default-nodes';
import type {ElementNode} from 'lexical';
import type {ExportChildren} from '..';

module.exports = {
    export(node: ElementNode, options: RendererOptions, exportChildren: ExportChildren) {
        if (!$isQuoteNode(node)) {
            return null;
        }

        return `<blockquote>${exportChildren(node)}</blockquote>`;
    }
};
