import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {LinkNode} from '@lexical/link';
import {AsideNode} from './AsideNode';
import {HorizontalRuleNode} from './HorizontalRuleNode';
import {CodeBlockNode} from './CodeBlockNode';
import {AudioNode} from './AudioNode';
import {ImageNode} from './ImageNode';
import {MarkdownNode} from './MarkdownNode';

const DEFAULT_NODES = [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    AsideNode,
    LinkNode,
    CodeBlockNode,
    HorizontalRuleNode,
    ImageNode,
    MarkdownNode,
    AudioNode
];

export default DEFAULT_NODES;
