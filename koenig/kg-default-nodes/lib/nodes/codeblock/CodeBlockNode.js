/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseCodeBlockNode} from './codeblock-parser';
import {renderCodeBlockNode} from './codeblock-renderer';

export class CodeBlockNode extends generateDecoratorNode({
    nodeType: 'codeblock',
    properties: [
        {name: 'code', default: '', wordCount: true},
        {name: 'language', default: ''},
        {name: 'caption', default: '', urlType: 'html', wordCount: true}
    ],
    defaultRenderFn: renderCodeBlockNode
}) {
    static importDOM() {
        return parseCodeBlockNode(this);
    }

    isEmpty() {
        return !this.__code;
    }
}

export function $createCodeBlockNode(dataset) {
    return new CodeBlockNode(dataset);
}

export function $isCodeBlockNode(node) {
    return node instanceof CodeBlockNode;
}
