import {$isParagraphNode} from 'lexical';
import type {LexicalNode} from 'lexical';
import type {ExportChildren} from '..';
import type {RendererOptions} from '../../convert-to-html-string';

module.exports = {
    export(node: LexicalNode, options: RendererOptions, exportChildren: ExportChildren) {
        if (!$isParagraphNode(node)) {
            return null;
        }

        return `<p>${exportChildren(node)}</p>`;
    }
};
