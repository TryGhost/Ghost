import React from 'react';
import {CollectionNode as BaseCollectionNode} from '@tryghost/kg-default-nodes';
// TODO: update icons
import {ReactComponent as CollectionCardIcon} from '../assets/icons/kg-card-type-gallery.svg';
import {CollectionNodeComponent} from './CollectionNodeComponent';
import {KoenigCardWrapper} from '../index.js';
import {createCommand} from 'lexical';

export const INSERT_COLLECTION_COMMAND = createCommand();

export class CollectionNode extends BaseCollectionNode {
    static kgMenu = [{
        label: 'Post collection',
        desc: 'Showcase latest or featured posts',
        Icon: CollectionCardIcon,
        insertCommand: INSERT_COLLECTION_COMMAND,
        matches: ['collection', 'post'],
        priority: 18,
        postType: 'page',
        isHidden: ({config}) => !config?.feature?.collectionsCard || !config?.feature?.collections // hide if missing collections or collectionsCard flags
    }];

    getIcon() {
        return CollectionCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <CollectionNodeComponent
                    collection={this.collection}
                    columns={this.columns}
                    layout={this.layout}
                    nodeKey={this.getKey()}
                    postCount={this.postCount}
                    rows={this.rows}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createCollectionNode = (dataset) => {
    return new CollectionNode(dataset);
};

export function $isCollectionNode(node) {
    return node instanceof CollectionNode;
}
