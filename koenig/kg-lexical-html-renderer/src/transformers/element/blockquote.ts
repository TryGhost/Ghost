/* c8 ignore start */
import {$isQuoteNode} from '@lexical/rich-text';
import type {RendererOptions} from '../../types.js';
import type {ElementNode} from 'lexical';
import type {ExportChildren} from '../index.js';
/* c8 ignore stop */

export default {
    export(node: ElementNode, options: RendererOptions, exportChildren: ExportChildren) {
        if (!$isQuoteNode(node)) {
            return null;
        }

        if (options.target === 'email') {
            let children = exportChildren(node);

            if (!children.startsWith('<p>')) {
                children = `<p>${children}</p>`;
            }

            return `<blockquote>${children}</blockquote>`;
        }

        return `<blockquote>${exportChildren(node)}</blockquote>`;
    }
};
