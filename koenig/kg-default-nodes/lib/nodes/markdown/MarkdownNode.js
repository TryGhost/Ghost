/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderMarkdownNode} from './markdown-renderer';

export class MarkdownNode extends generateDecoratorNode({
    nodeType: 'markdown',
    properties: [
        {name: 'markdown', default: '', urlType: 'markdown', wordCount: true}
    ],
    defaultRenderFn: renderMarkdownNode
}) {
    isEmpty() {
        return !this.__markdown;
    }
}

export function $createMarkdownNode(dataset) {
    return new MarkdownNode(dataset);
}

export function $isMarkdownNode(node) {
    return node instanceof MarkdownNode;
}
