import * as image from './nodes/image/ImageNode';
import * as codeblock from './nodes/codeblock/CodeBlockNode';

// re-export everything for easier importing
export * from './KoenigDecoratorNode';
export * from './nodes/image/ImageNode';
export * from './nodes/image/ImageParser';
export * from './nodes/codeblock/CodeBlockNode';

// export convenience objects for use elsewhere
export const DEFAULT_NODES = [
    codeblock.CodeBlockNode,
    image.ImageNode
];
