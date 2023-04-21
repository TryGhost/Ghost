import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$generateHtmlFromNodes} from '@lexical/html';
import {ImageNode as BaseImageNode, INSERT_IMAGE_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as GIFIcon} from '../assets/icons/kg-card-type-gif.svg';
import {ReactComponent as ImageCardIcon} from '../assets/icons/kg-card-type-image.svg';
import {ImageNodeComponent} from './ImageNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {OPEN_TENOR_SELECTOR_COMMAND, OPEN_UNSPLASH_SELECTOR_COMMAND} from '../plugins/KoenigSelectorPlugin.jsx';
import {ReactComponent as UnsplashIcon} from '../assets/icons/kg-card-type-unsplash.svg';
import {createEditor} from 'lexical';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_IMAGE_COMMAND} from '@tryghost/kg-default-nodes';

export class ImageNode extends BaseImageNode {
    // transient properties used to control node behaviour
    __triggerFileDialog = false;
    __previewSrc = null;
    __captionEditor;
    __captionEditorInitialState;

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
        insertCommand: OPEN_UNSPLASH_SELECTOR_COMMAND,
        insertParams: {
            triggerFileDialog: false
        },
        matches: ['unsplash', 'uns'],
        queryParams: ['src']
    },
    {
        label: 'GIF',
        desc: 'Search and embed gifs',
        Icon: GIFIcon,
        insertCommand: OPEN_TENOR_SELECTOR_COMMAND,
        insertParams: {
            triggerFileDialog: false
        },
        matches: ['gif', 'giphy', 'tenor'],
        queryParams: ['src'],
        isHidden: ({config}) => !config?.tenor
    }];

    static uploadType = 'image';

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {previewSrc, triggerFileDialog, initialFile, selector, isImageHidden, caption} = dataset;

        this.__previewSrc = previewSrc || '';
        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;

        // passed via INSERT_MEDIA_COMMAND on drag+drop or paste
        this.__initialFile = initialFile || null;

        this.__selector = selector;
        this.__isImageHidden = isImageHidden;

        // set up and populate nested editors from the serialized HTML
        this.__captionEditor = dataset.captionEditor || createEditor({nodes: MINIMAL_NODES});
        this.__captionEditorInitialState = dataset.captionEditorInitialState;

        if (!this.__captionEditorInitialState) {
            // wrap the caption in a paragraph so it gets parsed correctly
            // - we serialize with no wrapper so the renderer can decide how to wrap it
            const initialHtml = caption ? `<p>${caption}</p>` : null;

            // store the initial state separately as it's passed in to `<CollaborationPlugin />`
            // for use when there is no YJS document already stored
            this.__captionEditorInitialState = generateEditorState({
                // create a new editor instance so we don't pre-fill an editor that will be filled by YJS content
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml
            });
        }
    }

    getIcon() {
        return ImageCardIcon;
    }

    getDataset() {
        const dataset = super.getDataset();

        dataset.__previewSrc = this.__previewSrc;
        dataset.__triggerFileDialog = this.__triggerFileDialog;

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.captionEditor = self.__captionEditor;
        dataset.captionEditorInitialState = self.__captionEditorInitialState;

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

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__captionEditor) {
            this.__captionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__captionEditor, null);
                const cleanedHtml = cleanBasicHtml(html, {firstChildInnerContent: true});
                json.caption = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        const Selector = this.__selector;

        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                {this.__selector && <Selector nodeKey={this.getKey()} />}

                {
                    !this.__isImageHidden && (
                        <ImageNodeComponent
                            altText={this.__altText}
                            captionEditor={this.__captionEditor}
                            captionEditorInitialState={this.__captionEditorInitialState}
                            href={this.__href}
                            initialFile={this.__initialFile}
                            nodeKey={this.getKey()}
                            previewSrc={this.getPreviewSrc()}
                            src={this.__src}
                            triggerFileDialog={this.__triggerFileDialog}
                        />
                    )
                }
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
