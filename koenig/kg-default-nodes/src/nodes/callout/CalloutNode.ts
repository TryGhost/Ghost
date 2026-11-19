import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderCalloutNode} from './callout-renderer.js';
import {parseCalloutNode} from './callout-parser.js';

const calloutProperties = {
    calloutText: {default: '', wordCount: true},
    calloutEmoji: {default: '💡'},
    backgroundColor: {default: 'blue'}
} satisfies DecoratorNodePropertyMap;

export type CalloutData = DecoratorNodeData<typeof calloutProperties, true>;

export class CalloutNode extends generateDecoratorNode({
    nodeType: 'callout',
    hasVisibility: true,
    properties: calloutProperties,
    defaultRenderFn: renderCalloutNode
}) {
    /* override */
    constructor({calloutText, calloutEmoji, backgroundColor, visibility}: CalloutData = {}, key?: string) {
        super({visibility}, key);
        this.__calloutText = calloutText || '';
        this.__calloutEmoji = calloutEmoji ?? '💡';
        this.__backgroundColor = backgroundColor || 'blue';
    }

    static importDOM() {
        return parseCalloutNode(this);
    }
}

export function $isCalloutNode(node: unknown): node is CalloutNode {
    return node instanceof CalloutNode;
}

export const $createCalloutNode = (dataset: CalloutData = {}) => {
    return new CalloutNode(dataset);
};
