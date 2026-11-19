/* c8 ignore start */
import {$isHeadingNode} from '@lexical/rich-text';
import generateId from '../../utils/generate-id.js';
import type {RendererOptions} from '../../types.js';
import type {ElementNode} from 'lexical';
import type {ExportChildren} from '../index.js';
/* c8 ignore stop */

export default {
    export(node: ElementNode, options: RendererOptions, exportChildren: ExportChildren) {
        if (!$isHeadingNode(node)) {
            return null;
        }

        // A tag that isn't a heading tag (`h` and a number) renders as h2
        const tag = /^h\d+$/.test(node.getTag()) ? node.getTag() : 'h2';
        const id = generateId(node.getTextContent(), options);

        return `<${tag} id="${id}">${exportChildren(node)}</${tag}>`;
    }
};
