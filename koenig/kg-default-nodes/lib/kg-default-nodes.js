import * as image from './nodes/image/ImageNode';
import * as codeblock from './nodes/codeblock/CodeBlockNode';
import * as markdown from './nodes/markdown/MarkdownNode';
import * as video from './nodes/video/VideoNode';
import * as audio from './nodes/audio/AudioNode';
import * as callout from './nodes/callout/CalloutNode';
import * as aside from './nodes/aside/AsideNode';
import * as horizontalrule from './nodes/horizontalrule/HorizontalRuleNode';
import * as html from './nodes/html/HtmlNode';
import * as toggle from './nodes/toggle/ToggleNode';
import * as button from './nodes/button/ButtonNode';
import * as bookmark from './nodes/bookmark/BookmarkNode';
import * as file from './nodes/file/FileNode';
import * as paywall from './nodes/paywall/PaywallNode';
import * as product from './nodes/product/ProductNode';
import * as embed from './nodes/embed/EmbedNode';
import * as email from './nodes/email/EmailNode';

// re-export everything for easier importing
export * from './KoenigDecoratorNode';
export * from './nodes/image/ImageNode';
export * from './nodes/image/ImageParser';
export * from './nodes/codeblock/CodeBlockNode';
export * from './nodes/markdown/MarkdownNode';
export * from './nodes/video/VideoNode';
export * from './nodes/audio/AudioNode';
export * from './nodes/callout/CalloutNode';
export * from './nodes/aside/AsideNode';
export * from './nodes/horizontalrule/HorizontalRuleNode';
export * from './nodes/html/HtmlNode';
export * from './nodes/toggle/ToggleNode';
export * from './nodes/button/ButtonNode';
export * from './nodes/bookmark/BookmarkNode';
export * from './nodes/file/FileNode';
export * from './nodes/paywall/PaywallNode';
export * from './nodes/product/ProductNode';
export * from './nodes/embed/EmbedNode';
export * from './nodes/email/EmailNode';

// export convenience objects for use elsewhere
export const DEFAULT_NODES = [
    codeblock.CodeBlockNode,
    image.ImageNode,
    markdown.MarkdownNode,
    video.VideoNode,
    audio.AudioNode,
    callout.CalloutNode,
    aside.AsideNode,
    horizontalrule.HorizontalRuleNode,
    html.HtmlNode,
    file.FileNode,
    toggle.ToggleNode,
    button.ButtonNode,
    bookmark.BookmarkNode,
    paywall.PaywallNode,
    product.ProductNode,
    embed.EmbedNode,
    email.EmailNode
];
