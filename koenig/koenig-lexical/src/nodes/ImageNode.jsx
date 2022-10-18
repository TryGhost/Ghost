import React from 'react';
import {DecoratorNode, createCommand} from 'lexical';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ReactComponent as ImageCardIcon} from '../assets/icons/kg-card-type-image.svg';
import ImageCard from '../components/Cards/ImageCard';
export const INSERT_IMAGE_COMMAND = createCommand();

function convertImageElement(domNode) {
    if (domNode instanceof HTMLImageElement) {
        const {altText, src} = domNode;
        const node = $createImageNode({altText, src});
        return {node};
    }
    return null;
}

export class ImageNode extends DecoratorNode {
    static getType() {
        return 'image';
    }
    static clone(node) {
        return new ImageNode(
            node.__src,
            node.__caption,
            node.__altText,
            node.__key,
            node.__uploadProgress
        );
    }

    static importJSON(serializedNode) {
        const {caption, altText, src} = serializedNode;
        const node = $createImageNode({
            altText,
            caption,
            src
        });
        return node;
    }

    static kgMenu = {
        label: 'Image',
        desc: 'Upload, or embed with /image [url]',
        Icon: ImageCardIcon,
        insertCommand: INSERT_IMAGE_COMMAND
    };

    exportDOM(){
        const element = document.createElement('figure');
        const img = document.createElement('img');
        const figcaption = document.createElement('figcaption');
        img.src = this.getSrc();
        // img.alt = this.getAlt();
        figcaption.innerHTML = this.getCaption();
        element.appendChild(img);
        element.appendChild(figcaption);
        return {element};
    }

    static importDom() {
        return {
            img: (node = Node) => ({
                conversion: convertImageElement,
                priority: 1
            })
        };
    }

    constructor(src, caption, altText, key) {
        super(key);
        this.__caption = caption || '';
        this.__altText = altText || '';
        this.__src = src || '';
    }

    exportJSON() {
        // checks if src is a data string
        const src = this.getSrc();
        const isBlob = src.startsWith('data:');
        const dataset = {
            altText: this.getAltText(),
            caption: this.getCaption(),
            src: isBlob ? '<base64String>' : this.getSrc(),
            type: 'image'
        };
        return dataset;
    }

    getSrc() {
        return this.__src;
    }

    setUploadProgress(progress) {
        this.__uploadProgress = progress;
        return this.__uploadProgress;
    }

    getPayload() {
        return this.getLatest();
    }

    createDOM() {
        const element = document.createElement('div');
        return element;
    }
    updateDOM() {
        return false;
    }

    setSrc(src) {
        const self = this.getWritable();
        return self.__src = src;
    }

    setCaption(caption) {
        const self = this.getWritable();
        return self.__caption = caption;
    }

    getCaption() {
        return this.__caption;
    }

    setAltText(altText) {
        const self = this.getWritable();
        return self.__altText = altText;
    }

    getAltText() {
        return this.__altText;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <ImageCard nodeKey={this.getKey()} />
            </KoenigCardWrapper>
        );
    }
}

export const $createImageNode = ({src, caption, altText} = {}) => {
    const node = new ImageNode(src, caption, altText);
    return node;
};

export function $isImageNode(node) {
    return node instanceof ImageNode;
}

export default ImageNode;
