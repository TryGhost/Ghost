import {generateDecoratorNode, type DecoratorNodeProperty} from '../../generate-decorator-node.js';
import {parseBookmarkNode} from './bookmark-parser.js';
import {renderBookmarkNode} from './bookmark-renderer.js';

interface BookmarkMetadata {
    icon?: string;
    title?: string;
    description?: string;
    author?: string;
    publisher?: string;
    thumbnail?: string;
}

export interface BookmarkData {
    url?: string;
    metadata?: BookmarkMetadata;
    caption?: string;
}

export interface BookmarkNode {
    title: string;
    description: string;
    url: string;
    caption: string;
    author: string;
    publisher: string;
    icon: string;
    thumbnail: string;
}

const bookmarkProperties = [
    {name: 'title', default: '', wordCount: true},
    {name: 'description', default: '', wordCount: true},
    {name: 'url', default: '', urlType: 'url', wordCount: true},
    {name: 'caption', default: '', wordCount: true},
    {name: 'author', default: ''},
    {name: 'publisher', default: ''},
    {name: 'icon', urlPath: 'metadata.icon', default: '', urlType: 'url'},
    {name: 'thumbnail', urlPath: 'metadata.thumbnail', default: '', urlType: 'url'}
] as const satisfies readonly DecoratorNodeProperty[];

export class BookmarkNode extends generateDecoratorNode({
    nodeType: 'bookmark',
    properties: bookmarkProperties,
    defaultRenderFn: renderBookmarkNode
}) {
    static importDOM() {
        return parseBookmarkNode(this);
    }

    /* override */
    constructor({url, metadata, caption}: BookmarkData = {}, key?: string) {
        super({}, key);
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
    getDataset(): Record<string, unknown> {
        const self = this.getLatest();
        return {
            url: self.__url as string,
            metadata: {
                icon: self.__icon as string,
                title: self.__title as string,
                description: self.__description as string,
                author: self.__author as string,
                publisher: self.__publisher as string,
                thumbnail: self.__thumbnail as string
            },
            caption: self.__caption as string
        };
    }

    /* @override */
    static importJSON(serializedNode: Record<string, unknown>) {
        const {url, metadata, caption} = serializedNode as BookmarkData;
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

export const $createBookmarkNode = (dataset: BookmarkData = {}) => {
    return new BookmarkNode(dataset);
};

export function $isBookmarkNode(node: unknown): node is BookmarkNode {
    return node instanceof BookmarkNode;
}
