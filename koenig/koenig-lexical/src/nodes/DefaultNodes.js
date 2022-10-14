import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {LinkNode} from '@lexical/link';
import {AsideNode} from './AsideNode';
import {HorizontalRuleNode} from './HorizontalRuleNode';
import {CodeBlockNode} from './CodeBlockNode';
import {ImageNode} from './ImageNode';

const DEFAULT_NODES = [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    AsideNode,
    LinkNode,
    CodeBlockNode,
    HorizontalRuleNode,
    ImageNode
];

export default DEFAULT_NODES;
