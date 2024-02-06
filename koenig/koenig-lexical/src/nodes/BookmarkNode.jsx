import BookmarkCardIcon from '../assets/icons/kg-card-type-bookmark.svg?react';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BookmarkNode as BaseBookmarkNode} from '@tryghost/kg-default-nodes';
import {BookmarkNodeComponent} from './BookmarkNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_BOOKMARK_COMMAND = createCommand();

export class BookmarkNode extends BaseBookmarkNode {
    __captionEditor;
    __captionEditorInitialState;
    __createdWithUrl;

    static kgMenu = [{
        label: 'Bookmark',
        desc: 'Embed a link as a visual bookmark',
        Icon: BookmarkCardIcon,
        insertCommand: INSERT_BOOKMARK_COMMAND,
        matches: ['bookmark'],
        queryParams: ['url'],
        priority: 6,
        shortcut: '/bookmark [url]'
    }];

    getIcon() {
        return BookmarkCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        this.__createdWithUrl = !!dataset.url && !dataset.metadata;

        // set up nested editor instances
        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.captionEditor && dataset.caption) {
            populateNestedEditor(this, '__captionEditor', `${dataset.caption}`); // we serialize with no wrapper
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.captionEditor = self.__captionEditor;
        dataset.captionEditorInitialState = self.__captionEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__captionEditor) {
            this.__captionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__captionEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.caption = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <BookmarkNodeComponent
                    author={this.author}
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState}
                    createdWithUrl={this.__createdWithUrl}
                    description={this.description}
                    icon={this.icon}
                    nodeKey={this.getKey()}
                    publisher={this.publisher}
                    thumbnail={this.thumbnail}
                    title={this.title}
                    url={this.url}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createBookmarkNode = (dataset) => {
    return new BookmarkNode(dataset);
};

export function $isBookmarkNode(node) {
    return node instanceof BookmarkNode;
}
