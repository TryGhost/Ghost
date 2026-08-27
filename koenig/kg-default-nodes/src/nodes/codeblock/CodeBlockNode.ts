import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parseCodeBlockNode} from './codeblock-parser.js';
import {renderCodeBlockNode} from './codeblock-renderer.js';

const codeBlockProperties = {
    code: {default: '', wordCount: true},
    language: {default: ''},
    caption: {default: '', urlType: 'html', wordCount: true}
} satisfies DecoratorNodePropertyMap;

export type CodeBlockData = DecoratorNodeData<typeof codeBlockProperties>;

export class CodeBlockNode extends generateDecoratorNode({
    nodeType: 'codeblock',
    properties: codeBlockProperties,
    defaultRenderFn: renderCodeBlockNode
}) {
    static importDOM() {
        return parseCodeBlockNode(this);
    }

    isEmpty() {
        return !this.__code;
    }
}

export function $createCodeBlockNode(dataset: CodeBlockData = {}) {
    return new CodeBlockNode(dataset);
}

export function $isCodeBlockNode(node: unknown): node is CodeBlockNode {
    return node instanceof CodeBlockNode;
}
