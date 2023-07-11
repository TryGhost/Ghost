import {generateDecoratorNode} from '../../generate-decorator-node';
// import {parseCollectionNode} from './CollectionParser';
// import {renderCollectionNode} from './CollectionRenderer';

export class CollectionNode extends generateDecoratorNode({nodeType: 'collection',
    properties: [
        {name: 'collection', default: {title: 'featured', id: 123456}},
        {name: 'postCount', default: 3},
        {name: 'layout', default: 'grid'},
        {name: 'columns', default: 3}
    ]}
    // do we want a limit option so we don't have to 'get' and calculate it?
    // {name: 'limit', default: '3'}
    // may want other props like showing title, excerpt, date posted, etc.
) {
    // static importDOM() {
    //     return parseCollectionNode(this);
    // }

    // exportDOM(options = {}) {
    //     return renderCollectionNode(this, options);
    // }
}

export const $createCollectionNode = (dataset) => {
    return new CollectionNode(dataset);
};

export function $isCollectionNode(node) {
    return node instanceof CollectionNode;
}
