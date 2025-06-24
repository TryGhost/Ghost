/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseEmbedNode} from './embed-parser';
import {renderEmbedNode} from './embed-renderer';

export class EmbedNode extends generateDecoratorNode({
    nodeType: 'embed',
    properties: [
        {name: 'url', default: '', urlType: 'url'},
        {name: 'embedType', default: ''},
        {name: 'html', default: ''},
        {name: 'metadata', default: {}},
        {name: 'caption', default: '', wordCount: true}
    ],
    defaultRenderFn: renderEmbedNode
}) {
    static importDOM() {
        return parseEmbedNode(this);
    }

    isEmpty() {
        return !this.__url && !this.__html;
    }
}

export const $createEmbedNode = (dataset) => {
    return new EmbedNode(dataset);
};

export function $isEmbedNode(node) {
    return node instanceof EmbedNode;
}
