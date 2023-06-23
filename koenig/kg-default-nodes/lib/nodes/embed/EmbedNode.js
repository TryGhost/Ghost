import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseEmbedNode} from './EmbedParser';
import {renderEmbedNode} from './EmbedRenderer';

export class EmbedNode extends generateDecoratorNode({nodeType: 'embed',
    properties: [
        {name: 'url', default: '', urlType: 'url'},
        {name: 'embedType', default: ''},
        {name: 'html', default: ''},
        {name: 'metadata', default: {}},
        {name: 'caption', default: '', wordCount: true}
    ]}
) {
    static importDOM() {
        return parseEmbedNode(this);
    }

    exportDOM(options = {}) {
        return renderEmbedNode(this, options);
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
