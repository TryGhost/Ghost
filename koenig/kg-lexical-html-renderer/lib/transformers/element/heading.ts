import {$isHeadingNode} from '@lexical/rich-text';
import generateId from '../../utils/generate-id';
import type {LexicalNode} from 'lexical';
import type {ExportChildren} from '..';
import type {RendererOptions} from '../../convert-to-html-string';

module.exports = {
    export(node: LexicalNode, options: RendererOptions, exportChildren: ExportChildren) {
        if (!$isHeadingNode(node)) {
            return null;
        }

        const tag = node.getTag();
        const id = generateId(node.getTextContent(), options);

        return `<${tag} id="${id}">${exportChildren(node)}</${tag}>`;
    }
};
