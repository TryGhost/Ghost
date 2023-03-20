import * as image from './nodes/image/ImageNode';
import * as codeblock from './nodes/codeblock/CodeBlockNode';
import * as markdown from './nodes/markdown/MarkdownNode';
import * as video from './nodes/video/VideoNode';
import * as audio from './nodes/audio/AudioNode';
import * as callout from './nodes/callout/CalloutNode';
import * as aside from './nodes/aside/AsideNode';
import * as horizontalrule from './nodes/horizontalrule/HorizontalRuleNode';
import * as html from './nodes/html/HtmlNode';

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
    html.HtmlNode
];
