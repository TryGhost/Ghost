import {$isQuoteNode} from '@lexical/rich-text';
import type {RendererOptions} from '@tryghost/kg-default-nodes';
import type {ElementNode} from 'lexical';
import type {ExportChildren} from '..';

module.exports = {
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
