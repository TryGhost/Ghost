import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parseButtonNode} from './button-parser.js';
import {renderButtonNode} from './button-renderer.js';

const buttonProperties = {
    buttonText: {default: ''},
    alignment: {default: 'center'},
    buttonUrl: {default: '', urlType: 'url'}
} satisfies DecoratorNodePropertyMap;

export type ButtonData = DecoratorNodeData<typeof buttonProperties>;

export class ButtonNode extends generateDecoratorNode({
    nodeType: 'button',
    properties: buttonProperties,
    defaultRenderFn: renderButtonNode
}) {
    static importDOM() {
        return parseButtonNode(this);
    }
}

export const $createButtonNode = (dataset: ButtonData = {}) => {
    return new ButtonNode(dataset);
};

export function $isButtonNode(node: unknown): node is ButtonNode {
    return node instanceof ButtonNode;
}
