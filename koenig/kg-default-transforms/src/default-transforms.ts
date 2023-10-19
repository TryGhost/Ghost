import {LexicalEditor} from 'lexical';
import {registerDenestTransform} from './transforms/denest.js';
import {registerRemoveAlignmentTransform} from './transforms/remove-alignment.js';
import {mergeRegister} from '@lexical/utils';
import {$createParagraphNode, ParagraphNode} from 'lexical';
import {$createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode} from '@lexical/rich-text';
import {ExtendedHeadingNode} from '@tryghost/kg-default-nodes';
import {ListItemNode, $createListItemNode, ListNode, $createListNode} from '@lexical/list';
import {registerMergeListNodesTransform} from './transforms/merge-list-nodes.js';

export * from './transforms/denest.js';
export * from './transforms/merge-list-nodes.js';
export * from './transforms/remove-alignment.js';

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
        registerDenestTransform(editor, ExtendedHeadingNode, node => ($createHeadingNode(node.getTag()))),
        registerDenestTransform(editor, QuoteNode, () => ($createQuoteNode())),
        registerDenestTransform(editor, ListNode, node => ($createListNode(node.getListType(), node.getStart()))),
        registerDenestTransform(editor, ListItemNode, () => ($createListItemNode())),

        // merge adjacent lists of the same type
        registerMergeListNodesTransform(editor)
    );
}
