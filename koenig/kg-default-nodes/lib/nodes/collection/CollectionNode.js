/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderCollectionNode} from './collection-renderer';
import {collectionParser} from './collection-parser';

export class CollectionNode extends generateDecoratorNode({nodeType: 'collection',
    properties: [
        {name: 'collection', default: 'latest'}, // start with empty object; might want to just store the slug
        {name: 'postCount', default: 3},
        {name: 'layout', default: 'grid'},
        {name: 'columns', default: 3},
        {name: 'header', default: '', wordCount: true}
    ]}
) {
    static importDOM() {
        return collectionParser(this);
    }

    exportDOM(options = {}) {
        return renderCollectionNode(this, options);
    }

    hasDynamicData() {
        return true;
    }

    async getDynamicData(options = {}) {
        const key = this.getKey();
        const collection = this.__collection;
        const postCount = this.__postCount;
        
        if (!options?.getCollectionPosts) {
            return;
        }

        const posts = await options.getCollectionPosts(collection, postCount);
        return {key, data: posts};
    }
}

export const $createCollectionNode = (dataset) => {
    return new CollectionNode(dataset);
};

export function $isCollectionNode(node) {
    return node instanceof CollectionNode;
}
