import * as image from './nodes/image/ImageNode';
import * as codeblock from './nodes/codeblock/CodeBlockNode';
import * as markdown from './nodes/markdown/MarkdownNode';
import * as video from './nodes/video/VideoNode';
import * as audio from './nodes/audio/AudioNode';
import * as callout from './nodes/callout/CalloutNode';
import * as callToAction from './nodes/call-to-action/CallToActionNode';
import * as aside from './nodes/aside/AsideNode';
import * as horizontalrule from './nodes/horizontalrule/HorizontalRuleNode';
import * as html from './nodes/html/HtmlNode';
import * as toggle from './nodes/toggle/ToggleNode';
import * as button from './nodes/button/ButtonNode';
import * as bookmark from './nodes/bookmark/BookmarkNode';
import * as file from './nodes/file/FileNode';
import * as header from './nodes/header/HeaderNode';
import * as paywall from './nodes/paywall/PaywallNode';
import * as product from './nodes/product/ProductNode';
import * as embed from './nodes/embed/EmbedNode';
import * as email from './nodes/email/EmailNode';
import * as gallery from './nodes/gallery/GalleryNode';
import * as emailCta from './nodes/email-cta/EmailCtaNode';
import * as signup from './nodes/signup/SignupNode';
import * as transistor from './nodes/transistor/TransistorNode';
import * as textnode from './nodes/ExtendedTextNode';
import * as headingnode from './nodes/ExtendedHeadingNode';
import * as quotenode from './nodes/ExtendedQuoteNode';
import * as tk from './nodes/TKNode';
import * as atLink from './nodes/at-link/index.js';
import * as zwnj from './nodes/zwnj/ZWNJNode.js';

import linebreakSerializers from './serializers/linebreak';
import paragraphSerializers from './serializers/paragraph';

// re-export everything for easier importing
export * from './KoenigDecoratorNode';
export * from './nodes/image/ImageNode';
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
export * from './nodes/header/HeaderNode';
export * from './nodes/paywall/PaywallNode';
export * from './nodes/product/ProductNode';
export * from './nodes/embed/EmbedNode';
export * from './nodes/email/EmailNode';
export * from './nodes/gallery/GalleryNode';
export * from './nodes/email-cta/EmailCtaNode';
export * from './nodes/signup/SignupNode';
export * from './nodes/transistor/TransistorNode';
export * from './nodes/call-to-action/CallToActionNode';
export * from './nodes/ExtendedTextNode';
export * from './nodes/ExtendedHeadingNode';
export * from './nodes/ExtendedQuoteNode';
export * from './nodes/TKNode';
export * from './nodes/at-link/index.js';
export * from './nodes/zwnj/ZWNJNode';

// export utility functions that are useful in other packages or tests
import * as visibilityUtils from './utils/visibility';
import * as taggedTemplateFns from './utils/tagged-template-fns.mjs';
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
