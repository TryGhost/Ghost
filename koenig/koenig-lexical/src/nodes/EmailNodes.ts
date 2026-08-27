import {
    ExtendedHeadingNode,
    ExtendedTextNode,
    extendedHeadingNodeReplacement,
    extendedTextNodeReplacement
} from '@tryghost/kg-default-nodes';

import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';

import {HorizontalRuleNode} from './HorizontalRuleNode';

const EMAIL_NODES = [
    ExtendedTextNode,
    extendedTextNodeReplacement,
    HeadingNode,
    ExtendedHeadingNode,
    extendedHeadingNodeReplacement,
    QuoteNode,
    ListNode,
    ListItemNode,
    LinkNode,
    HorizontalRuleNode
];

export default EMAIL_NODES;
