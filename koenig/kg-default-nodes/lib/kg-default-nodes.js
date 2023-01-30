import * as image from './nodes/image/ImageNode';
import * as codeblock from './nodes/codeblock/CodeBlockNode';
import * as markdown from './nodes/markdown/MarkdownNode';
import * as video from './nodes/video/VideoNode';

// re-export everything for easier importing
export * from './KoenigDecoratorNode';
export * from './nodes/image/ImageNode';
export * from './nodes/image/ImageParser';
export * from './nodes/codeblock/CodeBlockNode';
export * from './nodes/markdown/MarkdownNode';
export * from './nodes/video/VideoNode';

// export convenience objects for use elsewhere
export const DEFAULT_NODES = [
    codeblock.CodeBlockNode,
    image.ImageNode,
    markdown.MarkdownNode,
    video.VideoNode
];
