import {AsideNode} from '../nodes/AsideNode';
import {BookmarkNode} from '../nodes/BookmarkNode';
import {ButtonNode} from '../nodes/ButtonNode';
import {CalloutNode} from '../nodes/CalloutNode';
import {EmailCtaNode} from '../nodes/EmailCtaNode';
import {
    ExtendedHeadingNode,
    ExtendedQuoteNode,
    ExtendedTextNode,
    extendedHeadingNodeReplacement,
    extendedQuoteNodeReplacement,
    extendedTextNodeReplacement
} from '@tryghost/kg-default-nodes';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {HorizontalRuleNode} from '../nodes/HorizontalRuleNode';
import {HtmlNode} from '../nodes/HtmlNode';
import {ImageNode} from '../nodes/ImageNode';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';

/**
 * Node set for the email editor. Slimmed down version of the default nodes exempting those that aren't meant for email.
 */
const EMAIL_EDITOR_NODES = [
    // Base text nodes
    ExtendedTextNode,
    extendedTextNodeReplacement,
    HeadingNode,
    ExtendedHeadingNode,
    extendedHeadingNodeReplacement,
    QuoteNode,
    ExtendedQuoteNode,
    extendedQuoteNodeReplacement,
    ListNode,
    ListItemNode,
    AsideNode,
    LinkNode,

    // Cards for email
    HorizontalRuleNode,
    ImageNode,
    CalloutNode,
    HtmlNode,
    ButtonNode,
    BookmarkNode,
    EmailCtaNode
];

export default EMAIL_EDITOR_NODES;
