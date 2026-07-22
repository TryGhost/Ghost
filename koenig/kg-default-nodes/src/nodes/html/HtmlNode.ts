import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderHtmlNode} from './html-renderer.js';
import {parseHtmlNode} from './html-parser.js';

const htmlProperties = {
    html: {default: '', urlType: 'html', wordCount: true}
} satisfies DecoratorNodePropertyMap;

export type HtmlData = DecoratorNodeData<typeof htmlProperties, true>;

export class HtmlNode extends generateDecoratorNode({
    nodeType: 'html',
    hasVisibility: true,
    properties: htmlProperties,
    defaultRenderFn: renderHtmlNode
}) {
    static importDOM() {
        return parseHtmlNode(this);
    }

    isEmpty() {
        return !this.__html;
    }
}

export function $createHtmlNode(dataset: HtmlData = {}) {
    return new HtmlNode(dataset);
}

export function $isHtmlNode(node: unknown): node is HtmlNode {
    return node instanceof HtmlNode;
}
