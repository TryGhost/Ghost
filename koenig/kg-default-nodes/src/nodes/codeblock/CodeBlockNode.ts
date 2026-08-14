import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseCodeBlockNode} from './codeblock-parser.js';
import {renderCodeBlockNode} from './codeblock-renderer.js';

const codeBlockProperties = [
    {name: 'code', default: '', wordCount: true},
    {name: 'language', default: ''},
    {name: 'caption', default: '', urlType: 'html', wordCount: true}
] as const satisfies readonly DecoratorNodeProperty[];

export type CodeBlockData = DecoratorNodeData<typeof codeBlockProperties>;

export interface CodeBlockNode extends DecoratorNodeValueMap<typeof codeBlockProperties> {}

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
