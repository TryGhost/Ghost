/* c8 ignore start */
import {registerDenestTransform} from './transforms/denest.js';
import {registerRemoveAlignmentTransform} from './transforms/remove-alignment.js';
import {registerMergeListNodesTransform} from './transforms/merge-list-nodes.js';
import {mergeRegister} from '@lexical/utils';
import {$createParagraphNode, ParagraphNode} from 'lexical';
import {$createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode} from '@lexical/rich-text';
import {ExtendedHeadingNode} from '@tryghost/kg-default-nodes';
import {$createListItemNode, $createListNode, ListItemNode, ListNode} from '@lexical/list';
import type {LexicalEditor} from 'lexical';

export * from './transforms/denest.js';
export * from './transforms/merge-list-nodes.js';
export * from './transforms/remove-alignment.js';

// only used when rendering so not registered by default
export * from './transforms/remove-at-link-nodes.js';
/* c8 ignore stop */

/* c8 ignore next */
export function registerDefaultTransforms(editor: LexicalEditor) {
    return mergeRegister(
        // strip unwanted alignment formats
        registerRemoveAlignmentTransform(editor, ParagraphNode),
        registerRemoveAlignmentTransform(editor, HeadingNode),
        registerRemoveAlignmentTransform(editor, ExtendedHeadingNode),
        registerRemoveAlignmentTransform(editor, QuoteNode),

        // fix invalid nesting of nodes
        registerDenestTransform(editor, ParagraphNode, () => ($createParagraphNode())),
        registerDenestTransform(editor, HeadingNode, node => ($createHeadingNode(node.getTag()))),
        registerDenestTransform(editor, ExtendedHeadingNode, (node: ExtendedHeadingNode) => ($createHeadingNode(node.getTag()))),
        registerDenestTransform(editor, QuoteNode, () => ($createQuoteNode())),
        registerDenestTransform(editor, ListNode, node => ($createListNode(node.getListType(), node.getStart()))),
        registerDenestTransform(editor, ListItemNode, () => ($createListItemNode())),

        // merge adjacent lists of the same type
        registerMergeListNodesTransform(editor)
    );
}
