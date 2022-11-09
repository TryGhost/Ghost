import React from 'react';
import {DecoratorNode, createCommand} from 'lexical';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ReactComponent as ImageCardIcon} from '../assets/icons/kg-card-type-image.svg';
import {ImageNodeComponent} from './ImageNodeComponent';
export const INSERT_IMAGE_COMMAND = createCommand();

function convertImageElement(domNode) {
    if (domNode instanceof HTMLImageElement) {
        const {alt: altText, src} = domNode;
        const node = $createImageNode({altText, src});
        return {node};
    }
    // TODO: add <figure> and other handling from kg-parser-plugins
    return null;
}

export class ImageNode extends DecoratorNode {
    // payload properties
    __src;
    __caption;
    __altText;
    __cardWidth;
    // TODO:
    // __width;
    // __height;

    // TODO: does this belong on the node? If we're storing progress here because
    // the node might be re-created whilst uploading then wouldn't we need file
    // refs too?
    __uploadProgress;

    // transient properties used to control node behaviour
    __triggerFileDialog = false;

    static getType() {
        return 'image';
    }

    static kgMenu = {
        label: 'Image',
        desc: 'Upload, or embed with /image [url]',
        Icon: ImageCardIcon,
        insertCommand: INSERT_IMAGE_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['image', 'img'],
        queryParams: ['src']
    };

    static clone(node) {
        return new ImageNode(
            {
                src: node.__src,
                caption: node.__caption,
                altText: node.__altText,
                cardWidth: node.__cardWidth,
                uploadProgress: node.__uploadProgress
            },
            node.__key
        );
    }

    static importJSON(serializedNode) {
        const {caption, altText, src, cardWidth} = serializedNode;
        const node = $createImageNode({
            altText,
            caption,
            src,
            cardWidth
        });
        return node;
    }

    exportDOM(){
        const element = document.createElement('figure');
        const img = document.createElement('img');
        const figcaption = document.createElement('figcaption');
        img.src = this.getSrc();
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

    constructor({src, caption, altText, cardWidth, uploadProgress, triggerFileDialog} = {}, key) {
        super(key);
        this.__caption = caption || '';
        this.__altText = altText || '';
        this.__src = src || '';
        this.__cardWidth = cardWidth || 'regular';
        this.__uploadProgress = uploadProgress;
        this.__triggerFileDialog = triggerFileDialog || false;
    }

    exportJSON() {
        // checks if src is a data string
        const src = this.getSrc();
        const isBlob = src.startsWith('data:');
        const dataset = {
            altText: this.getAltText(),
            caption: this.getCaption(),
            src: isBlob ? '<base64String>' : this.getSrc(),
            type: 'image',
            cardWidth: this.getCardWidth()
        };
        return dataset;
    }

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

    getSrc() {
        return this.__src;
    }

    setSrc(src) {
        const writable = this.getWritable();
        return writable.__src = src;
    }

    setCardWidth(cardWidth) {
        const writable = this.getWritable();
        return writable.__cardWidth = cardWidth;
    }

    getCardWidth() {
        return this.__cardWidth;
    }

    getCaption() {
        return this.__caption;
    }

    setCaption(caption) {
        const writable = this.getWritable();
        return writable.__caption = caption;
    }

    getAltText() {
        return this.__altText;
    }

    setAltText(altText) {
        const writable = this.getWritable();
        return writable.__altText = altText;
    }

    getUploadProgress() {
        return this.__uploadProgress;
    }

    setUploadProgress(progress) {
        const writable = this.getWritable();
        return writable.__uploadProgress = progress;
    }

    setTriggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        return writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                <ImageNodeComponent
                    nodeKey={this.getKey()}
                    src={this.__src}
                    altText={this.__altText}
                    caption={this.__caption}
                    uploadProgress={this.__uploadProgress}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createImageNode = (dataset) => {
    // don't trigger the file dialog when rendering if we've already been given a url
    if (dataset.src) {
        delete dataset.triggerFileDialog;
    }

    return new ImageNode(dataset);
};

export function $isImageNode(node) {
    return node instanceof ImageNode;
}

export default ImageNode;
