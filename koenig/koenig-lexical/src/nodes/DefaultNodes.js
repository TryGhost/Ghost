import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {LinkNode} from '@lexical/link';
import {AsideNode} from './AsideNode';
import {HorizontalRuleNode} from './HorizontalRuleNode';
import {CodeBlockNode} from './CodeBlockNode';

const DEFAULT_NODES = [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    AsideNode,
    LinkNode,
    CodeBlockNode, // TODO: replace with our own card
    HorizontalRuleNode
];

export default DEFAULT_NODES;
