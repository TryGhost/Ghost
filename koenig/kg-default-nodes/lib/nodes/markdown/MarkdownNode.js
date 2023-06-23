import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderMarkdownNode} from './MarkdownRenderer';

export class MarkdownNode extends generateDecoratorNode({nodeType: 'markdown',
    properties: [
        {name: 'markdown', default: '', urlType: 'markdown', wordCount: true}
    ]}
) {
    exportDOM(options = {}) {
        return renderMarkdownNode(this, options);
    }

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
