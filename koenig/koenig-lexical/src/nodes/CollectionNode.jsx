import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {CollectionNode as BaseCollectionNode} from '@tryghost/kg-default-nodes';
import {ReactComponent as CollectionCardIcon} from '../assets/icons/kg-card-type-gallery.svg';
import {CollectionNodeComponent} from './CollectionNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_COLLECTION_COMMAND = createCommand();

export class CollectionNode extends BaseCollectionNode {
    __headerTextEditor;
    __headerTextEditorInitialState;

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

    constructor(dataset = {}, key) {
        super(dataset, key);

        setupNestedEditor(this, '__headerTextEditor', {editor: dataset.headerTextEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.headerTextEditor && dataset.header) {
            populateNestedEditor(this, '__headerTextEditor', `<p>${dataset.header}</p>`);
        }
    }

    exportJSON() {
        const json = super.exportJSON();
        if (this.__headerTextEditor) {
            this.__headerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headerTextEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
                json.header = cleanedHtml;
            });
        }
        return json;
    }

    getIcon() {
        return CollectionCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <CollectionNodeComponent
                    collection={this.collection}
                    columns={this.columns}
                    header={this.header}
                    headerTextEditor={this.__headerTextEditor}
                    headerTextEditorInitialState={this.__headerTextEditorInitialState}
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
