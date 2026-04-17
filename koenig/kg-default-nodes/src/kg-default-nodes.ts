export {GeneratedDecoratorNodeBase} from './generate-decorator-node.js';
export * from './export-dom.js';
import * as image from './nodes/image/ImageNode.js';
import * as codeblock from './nodes/codeblock/CodeBlockNode.js';
import * as markdown from './nodes/markdown/MarkdownNode.js';
import * as video from './nodes/video/VideoNode.js';
import * as audio from './nodes/audio/AudioNode.js';
import * as callout from './nodes/callout/CalloutNode.js';
import * as callToAction from './nodes/call-to-action/CallToActionNode.js';
import * as aside from './nodes/aside/AsideNode.js';
import * as horizontalrule from './nodes/horizontalrule/HorizontalRuleNode.js';
import * as html from './nodes/html/HtmlNode.js';
import * as toggle from './nodes/toggle/ToggleNode.js';
import * as button from './nodes/button/ButtonNode.js';
import * as bookmark from './nodes/bookmark/BookmarkNode.js';
import * as file from './nodes/file/FileNode.js';
import * as header from './nodes/header/HeaderNode.js';
import * as paywall from './nodes/paywall/PaywallNode.js';
import * as product from './nodes/product/ProductNode.js';
import * as embed from './nodes/embed/EmbedNode.js';
import * as email from './nodes/email/EmailNode.js';
import * as gallery from './nodes/gallery/GalleryNode.js';
import * as emailCta from './nodes/email-cta/EmailCtaNode.js';
import * as signup from './nodes/signup/SignupNode.js';
import * as transistor from './nodes/transistor/TransistorNode.js';
import * as textnode from './nodes/ExtendedTextNode.js';
import * as headingnode from './nodes/ExtendedHeadingNode.js';
import * as quotenode from './nodes/ExtendedQuoteNode.js';
import * as tk from './nodes/TKNode.js';
import * as atLink from './nodes/at-link/index.js';
import * as zwnj from './nodes/zwnj/ZWNJNode.js';

import linebreakSerializers from './serializers/linebreak.js';
import paragraphSerializers from './serializers/paragraph.js';

// re-export everything for easier importing
export * from './KoenigDecoratorNode.js';
export * from './nodes/image/ImageNode.js';
export * from './nodes/codeblock/CodeBlockNode.js';
export * from './nodes/markdown/MarkdownNode.js';
export * from './nodes/video/VideoNode.js';
export * from './nodes/audio/AudioNode.js';
export * from './nodes/callout/CalloutNode.js';
export * from './nodes/aside/AsideNode.js';
export * from './nodes/horizontalrule/HorizontalRuleNode.js';
export * from './nodes/html/HtmlNode.js';
export * from './nodes/toggle/ToggleNode.js';
export * from './nodes/button/ButtonNode.js';
export * from './nodes/bookmark/BookmarkNode.js';
export * from './nodes/file/FileNode.js';
export * from './nodes/header/HeaderNode.js';
export * from './nodes/paywall/PaywallNode.js';
export * from './nodes/product/ProductNode.js';
export * from './nodes/embed/EmbedNode.js';
export * from './nodes/email/EmailNode.js';
export * from './nodes/gallery/GalleryNode.js';
export * from './nodes/email-cta/EmailCtaNode.js';
export * from './nodes/signup/SignupNode.js';
export * from './nodes/transistor/TransistorNode.js';
export * from './nodes/call-to-action/CallToActionNode.js';
export * from './nodes/ExtendedTextNode.js';
export * from './nodes/ExtendedHeadingNode.js';
export * from './nodes/ExtendedQuoteNode.js';
export * from './nodes/TKNode.js';
export * from './nodes/at-link/index.js';
export * from './nodes/zwnj/ZWNJNode.js';

// export utility functions that are useful in other packages or tests
import * as visibilityUtils from './utils/visibility.js';
import * as taggedTemplateFns from './utils/tagged-template-fns.js';
import {generateDecoratorNode} from './generate-decorator-node.js';
import {rgbToHex} from './utils/rgb-to-hex.js';
export const utils = {
    generateDecoratorNode,
    visibility: visibilityUtils,
    rgbToHex,
    taggedTemplateFns
};

export const serializers = {
    linebreak: linebreakSerializers,
    paragraph: paragraphSerializers
};

export const DEFAULT_CONFIG = {
    html: {
        import: {
            ...serializers.linebreak.import,
            ...serializers.paragraph.import
        }
    }
};

// export convenience objects for use elsewhere
export const DEFAULT_NODES = [
    textnode.ExtendedTextNode,
    textnode.extendedTextNodeReplacement,
    headingnode.ExtendedHeadingNode,
    headingnode.extendedHeadingNodeReplacement,
    quotenode.ExtendedQuoteNode,
    quotenode.extendedQuoteNodeReplacement,
    codeblock.CodeBlockNode,
    image.ImageNode,
    markdown.MarkdownNode,
    video.VideoNode,
    audio.AudioNode,
    callout.CalloutNode,
    callToAction.CallToActionNode,
    aside.AsideNode,
    horizontalrule.HorizontalRuleNode,
    html.HtmlNode,
    file.FileNode,
    toggle.ToggleNode,
    button.ButtonNode,
    header.HeaderNode,
    bookmark.BookmarkNode,
    paywall.PaywallNode,
    product.ProductNode,
    embed.EmbedNode,
    email.EmailNode,
    gallery.GalleryNode,
    emailCta.EmailCtaNode,
    signup.SignupNode,
    transistor.TransistorNode,
    tk.TKNode,
    atLink.AtLinkNode,
    atLink.AtLinkSearchNode,
    zwnj.ZWNJNode
];
