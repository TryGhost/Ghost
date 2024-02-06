import CollectionCardIcon from '../assets/icons/kg-card-type-collection.svg?react';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {CollectionNode as BaseCollectionNode} from '@tryghost/kg-default-nodes';
import {CollectionNodeComponent} from './CollectionNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_COLLECTION_COMMAND = createCommand();

export class CollectionNode extends BaseCollectionNode {
    __headerEditor;
    __headerEditorInitialState;

    static kgMenu = [{
        label: 'Post collection',
        desc: 'Showcase latest or featured posts',
        Icon: CollectionCardIcon,
        insertCommand: INSERT_COLLECTION_COMMAND,
        matches: ['collection', 'post'],
        priority: 18,
        postType: 'page',
        isHidden: ({config}) => !config?.feature?.collectionsCard || !config?.feature?.collections, // hide if missing collections or collectionsCard flags
        shortcut: '/collection',
        insertParams: () => ({header: 'Latest'})
    }];

    constructor(dataset = {}, key) {
        super(dataset, key);

        setupNestedEditor(this, '__headerEditor', {editor: dataset.headerEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        const header = dataset.header || this.header; // dataset is not set when inserting a new card
        if (!dataset.headerEditor && header) {
            populateNestedEditor(this, '__headerEditor', `${header}`);
        }
    }

    exportJSON() {
        const json = super.exportJSON();
        if (this.__headerEditor) {
            this.__headerEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headerEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
                json.header = cleanedHtml;
            });
        }
        return json;
    }

    getIcon() {
        return CollectionCardIcon;
    }

    getDataset() {
        const dataset = super.getDataset();
        const self = this.getLatest();

        dataset.headerEditor = self.__headerEditor;

        return dataset;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
                width={'wide'}
            >
                <CollectionNodeComponent
                    collection={this.collection}
                    columns={this.columns}
                    headerEditor={this.__headerEditor}
                    headerEditorInitialState={this.__headerEditorInitialState}
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
