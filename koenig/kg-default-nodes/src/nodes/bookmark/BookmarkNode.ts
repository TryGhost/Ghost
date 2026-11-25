import {migrateOldVisibilityFormat, type Visibility} from '../../utils/visibility.js';
import {generateDecoratorNode, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
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
    visibility?: Visibility;
    url?: string;
    metadata?: BookmarkMetadata;
    caption?: string;
}

const bookmarkProperties = {
    title: {default: '', wordCount: true},
    description: {default: '', wordCount: true},
    url: {default: '', urlType: 'url', wordCount: true},
    caption: {default: '', wordCount: true},
    author: {default: ''},
    publisher: {default: ''},
    icon: {urlPath: 'metadata.icon', default: '', urlType: 'url'},
    thumbnail: {urlPath: 'metadata.thumbnail', default: '', urlType: 'url'}
} satisfies DecoratorNodePropertyMap;

export class BookmarkNode extends generateDecoratorNode({
    nodeType: 'bookmark',
    hasVisibility: true,
    properties: bookmarkProperties,
    defaultRenderFn: renderBookmarkNode
}) {
    static importDOM() {
        return parseBookmarkNode(this);
    }

    /* override */
    constructor({url, metadata, caption, visibility}: BookmarkData = {}, key?: string) {
        super({visibility}, key);
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
            url: self.url,
            metadata: {
                icon: self.icon,
                title: self.title,
                description: self.description,
                author: self.author,
                publisher: self.publisher,
                thumbnail: self.thumbnail
            },
            caption: self.caption,
            visibility: self.visibility
        };
    }

    /* @override */
    static importJSON(serializedNode: Record<string, unknown>) {
        const {url, metadata, caption, visibility} = serializedNode as BookmarkData;
        // migrate older nodes that were saved with an earlier version of the visibility format
        const node = new this({
            url,
            metadata,
            caption,
            visibility: migrateOldVisibilityFormat(visibility as Visibility)
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
            caption: this.caption,
            visibility: this.visibility
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
