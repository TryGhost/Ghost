import {ListItemNode, ListNode} from '@lexical/list';
import {CodeNode} from '@lexical/code';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {LinkNode} from '@lexical/link';
import {AsideNode} from './AsideNode';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';

const DEFAULT_NODES = [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    AsideNode,
    LinkNode,
    CodeNode, // TODO: replace with our own card
    HorizontalRuleNode // TODO: replace with our own card
];

export default DEFAULT_NODES;
