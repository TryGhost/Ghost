import {$isAsideNode, RendererOptions} from '@tryghost/kg-default-nodes';
import type {ElementNode} from 'lexical';
import type {ExportChildren} from '..';

module.exports = {
    export(node: ElementNode, options: RendererOptions, exportChildren: ExportChildren) {
        /* c8 ignore next 3 */
        if (!$isAsideNode(node)) {
            return null;
        }

        return `<blockquote class="kg-blockquote-alt">${exportChildren(node)}</blockquote>`;
    }
};
