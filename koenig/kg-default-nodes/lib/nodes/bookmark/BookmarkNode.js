/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseBookmarkNode} from './bookmark-parser';
import {renderBookmarkNode} from './bookmark-renderer';

export class BookmarkNode extends generateDecoratorNode({
    nodeType: 'bookmark',
    properties: [
        {name: 'title', default: '', wordCount: true},
        {name: 'description', default: '', wordCount: true},
        {name: 'url', default: '', urlType: 'url', wordCount: true},
        {name: 'caption', default: '', wordCount: true},
        {name: 'author', default: ''},
        {name: 'publisher', default: ''},
        {name: 'icon', urlPath: 'metadata.icon', default: '', urlType: 'url'},
        {name: 'thumbnail', urlPath: 'metadata.thumbnail', default: '', urlType: 'url'}
    ],
    defaultRenderFn: renderBookmarkNode
}) {
    static importDOM() {
        return parseBookmarkNode(this);
    }

    /* override */
    constructor({url, metadata, caption} = {}, key) {
        super(key);
        this.__url = url || '';
        this.__icon = metadata?.icon || '';
        this.__title = metadata?.title || '';
        this.__description = metadata?.description || '';
        this.__author = metadata?.author || '';
        this.__publisher = metadata?.publisher || '';
        this.__thumbnail = metadata?.thumbnail || '';
        this.__caption = caption || '';
    }

    /* @override */
    getDataset() {
        const self = this.getLatest();
        return {
            url: self.__url,
            metadata: {
                icon: self.__icon,
                title: self.__title,
                description: self.__description,
                author: self.__author,
                publisher: self.__publisher,
                thumbnail: self.__thumbnail
            },
            caption: self.__caption
        };
    }

    /* @override */
    static importJSON(serializedNode) {
        const {url, metadata, caption} = serializedNode;
        const node = new this({
            url,
            metadata,
            caption
        });
        return node;
    }

    /* @override */
    exportJSON() {
        const dataset = {
            type: 'bookmark',
            version: 1,
            url: this.url,
            metadata: {
                icon: this.icon,
                title: this.title,
                description: this.description,
                author: this.author,
                publisher: this.publisher,
                thumbnail: this.thumbnail
            },
            caption: this.caption
        };
        return dataset;
    }

    isEmpty() {
        return !this.url;
    }
}

export const $createBookmarkNode = (dataset) => {
    return new BookmarkNode(dataset);
};

export function $isBookmarkNode(node) {
    return node instanceof BookmarkNode;
}
