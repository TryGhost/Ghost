/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderCollectionNode} from './collection-renderer';
import {collectionParser} from './collection-parser';

export class CollectionNode extends generateDecoratorNode({nodeType: 'collection',
    properties: [
        {name: 'collection', default: {slug: 'latest'}}, // start with empty object; might want to just store the slug
        {name: 'postCount', default: 3},
        {name: 'layout', default: 'grid'},
        {name: 'columns', default: 3},
        {name: 'header', default: 'Latest', wordCount: true}
    ]}
) {
    static importDOM() {
        return collectionParser(this);
    }

    exportDOM(options = {}) {
        return renderCollectionNode(this, options);
    }
}

export const $createCollectionNode = (dataset) => {
    return new CollectionNode(dataset);
};

export function $isCollectionNode(node) {
    return node instanceof CollectionNode;
}
