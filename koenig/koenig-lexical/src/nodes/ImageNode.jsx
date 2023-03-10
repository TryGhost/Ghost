import KoenigCardWrapper from '../components/KoenigCardWrapper';
import React from 'react';
import {ImageNode as BaseImageNode, INSERT_IMAGE_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as ImageCardIcon} from '../assets/icons/kg-card-type-image.svg';
import {ImageNodeComponent} from './ImageNodeComponent';
import {ReactComponent as UnsplashIcon} from '../assets/icons/kg-card-type-unsplash.svg';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_IMAGE_COMMAND} from '@tryghost/kg-default-nodes';

export class ImageNode extends BaseImageNode {
    // transient properties used to control node behaviour
    __triggerFileDialog = false;
    __previewSrc = null;

    static kgMenu = [{
        label: 'Image',
        desc: 'Upload, or embed with /image [url]',
        Icon: ImageCardIcon,
        insertCommand: INSERT_IMAGE_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['image', 'img'],
        queryParams: ['src']
    },
    {
        section: 'Embed',
        label: 'Unsplash',
        desc: '/unsplash [search term or url]',
        Icon: UnsplashIcon,
        insertCommand: INSERT_IMAGE_COMMAND,
        insertParams: {
            triggerFileDialog: false,
            triggerFileSelector: 'unsplash'
        },
        matches: ['unsplash', 'uns'],
        queryParams: ['src']
    }];

    static uploadType = 'image';

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {previewSrc, triggerFileDialog, initialFile} = dataset;

        this.__previewSrc = previewSrc || '';
        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;

        // passed via INSERT_MEDIA_COMMAND on drag+drop or paste
        this.__initialFile = initialFile || null;
    }

    getIcon() {
        return ImageCardIcon;
    }

    getDataset() {
        const dataset = super.getDataset();

        dataset.__previewSrc = this.__previewSrc;
        dataset.__triggerFileDialog = this.__triggerFileDialog;

        return dataset;
    }

    getPreviewSrc() {
        const self = this.getLatest();
        return self.__previewSrc;
    }

    setPreviewSrc(previewSrc) {
        const writable = this.getWritable();
        return writable.__previewSrc = previewSrc;
    }

    setTriggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        return writable.__triggerFileDialog = shouldTrigger;
    }

    createDOM() {
        return document.createElement('div');
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                <ImageNodeComponent
                    nodeKey={this.getKey()}
                    src={this.__src}
                    href={this.__href}
                    altText={this.__altText}
                    caption={this.__caption}
                    triggerFileDialog={this.__triggerFileDialog}
                    previewSrc={this.getPreviewSrc()}
                    initialFile={this.__initialFile}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createImageNode = (dataset) => {
    return new ImageNode(dataset);
};

export function $isImageNode(node) {
    return node instanceof ImageNode;
}
