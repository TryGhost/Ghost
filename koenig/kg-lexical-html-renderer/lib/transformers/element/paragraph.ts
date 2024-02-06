import {$isParagraphNode} from 'lexical';
import type {ElementNode} from 'lexical';
import type {ExportChildren} from '..';
import type {RendererOptions} from '@tryghost/kg-default-nodes';

module.exports = {
    export(node: ElementNode, options: RendererOptions, exportChildren: ExportChildren) {
        if (!$isParagraphNode(node)) {
            return null;
        }

        return `<p>${exportChildren(node)}</p>`;
    }
};
