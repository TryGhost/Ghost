import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {BookmarkParser} from './BookmarkParser';
import {renderBookmarkNodeToDOM} from './BookmarkRenderer';

export const INSERT_BOOKMARK_COMMAND = createCommand();

export class BookmarkNode extends KoenigDecoratorNode {
    // payload properties
    __url;
    __icon;
    __title;
    __description;
    __author;
    __publisher;
    __thumbnail;
    __caption;

    static getType() {
        return 'bookmark';
    }

    static clone(node) {
        return new this(
            node.getDataset(),
            node.__key
        );
    }

    // used by `@tryghost/url-utils` to transform URLs contained in the serialized JSON
    static get urlTransformMap() {
        return {
            url: 'url',
            icon: 'url',
            thumbnail: 'url'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            url: self.__url,
            icon: self.__icon,
            title: self.__title,
            description: self.__description,
            author: self.__author,
            publisher: self.__publisher,
            thumbnail: self.__thumbnail,
            caption: self.__caption
        
        };
    }

    constructor({url, icon, title, description, author, publisher, thumbnail, caption} = {}, key) {
        super(key);
        this.__url = url || '';
        this.__icon = icon || '';
        this.__title = title || '';
        this.__description = description || '';
        this.__author = author || '';
        this.__publisher = publisher || '';
        this.__thumbnail = thumbnail || '';
        this.__caption = caption || '';
    }

    static importJSON(serializedNode) {
        const {url, icon, title, description, author, publisher, thumbnail, caption} = serializedNode;
        const node = new this({
            url,
            icon,
            title,
            description,
            author,
            publisher, 
            thumbnail,
            caption
        });
        return node;
    }

    exportJSON() {
        const dataset = {
            type: 'bookmark',
            version: 1,
            url: this.getUrl(),
            icon: this.getIcon(),
            title: this.getTitle(),
            description: this.getDescription(),
            author: this.getAuthor(),
            publisher: this.getPublisher(),
            thumbnail: this.getThumbnail(),
            caption: this.getCaption()
        };
        return dataset;
    }

    // parser used when pasting html >> node
    static importDOM() {
        const parser = new BookmarkParser(this);
        return parser.DOMConversionMap;
    }

    // renderer used when copying node >> html
    exportDOM(options = {}) {
        const element = renderBookmarkNodeToDOM(this, options);
        return {element};
    }

    /* c8 ignore start */
    createDOM() {
        const element = document.createElement('div');
        return element;
    }

    updateDOM() {
        return false;
    }

    isInline() {
        return false;
    }
    /* c8 ignore stop */

    getUrl() {
        const self = this.getLatest();
        return self.__url;
    }

    setUrl(url) {
        const writable = this.getWritable();
        return writable.__url = url;
    }

    getIcon() {
        const self = this.getLatest();
        return self.__icon;
    }

    setIcon(icon) {
        const writable = this.getWritable();
        return writable.__icon = icon;
    }

    getTitle() {
        const self = this.getLatest();
        return self.__title;
    }

    setTitle(title) {
        const writable = this.getWritable();
        return writable.__title = title;
    }
    
    getDescription() {
        const self = this.getLatest();
        return self.__description;
    }

    setDescription(description) {
        const writable = this.getWritable();
        return writable.__description = description;
    }

    getAuthor() {
        const self = this.getLatest();
        return self.__author;
    }

    setAuthor(author) {
        const writable = this.getWritable();
        return writable.__author = author;
    }

    getPublisher() {
        const self = this.getLatest();
        return self.__publisher;
    }

    setPublisher(publisher) {
        const writable = this.getWritable();
        return writable.__publisher = publisher;
    }

    getThumbnail() {
        const self = this.getLatest();
        return self.__thumbnail;
    }

    setThumbnail(thumbnail) {
        const writable = this.getWritable();
        return writable.__thumbnail = thumbnail;
    }

    getCaption() {
        const self = this.getLatest();
        return self.__caption;
    }

    setCaption(caption) {
        const writable = this.getWritable();
        return writable.__caption = caption;
    }

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__url;
    }
}

export const $createBookmarkNode = (dataset) => {
    return new BookmarkNode(dataset);
};

export function $isBookmarkNode(node) {
    return node instanceof BookmarkNode;
}
