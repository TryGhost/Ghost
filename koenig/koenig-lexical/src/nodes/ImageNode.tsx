import GIFIcon from '../assets/icons/kg-card-type-gif.svg?react';
import ImageCardIcon from '../assets/icons/kg-card-type-image.svg?react';
import UnsplashIcon from '../assets/icons/kg-card-type-unsplash.svg?react';
import {$generateHtmlFromNodes} from '@lexical/html';
import {ImageNode as BaseImageNode, normalizeCardWidth, type ImageData} from '@tryghost/kg-default-nodes';
import {ImageNodeComponent} from './ImageNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index';
import {OPEN_GIF_SELECTOR_COMMAND, OPEN_UNSPLASH_SELECTOR_COMMAND} from '../plugins/KoenigSelectorPlugin';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';
import type {LexicalEditor} from 'lexical';

export type ImageNodeData = ImageData & {
    altText?: string;
    previewSrc?: string;
    triggerFileDialog?: boolean;
    initialFile?: File | null;
    selector?: React.ComponentType<{nodeKey: string}>;
    isImageHidden?: boolean;
    captionEditor?: unknown;
};

export const INSERT_IMAGE_COMMAND = createCommand<ImageNodeData>();

export class ImageNode extends BaseImageNode {
    // transient properties used to control node behaviour
    __triggerFileDialog: boolean = false;
    __previewSrc: string = '';
    __initialFile: File | null = null;
    __selector?: React.ComponentType<{nodeKey: string}>;
    __isImageHidden = false;
    __captionEditor!: LexicalEditor;
    __captionEditorInitialState: unknown;

    static kgMenu = [{
        label: 'Image',
        desc: 'Upload, or embed with /image [url]',
        Icon: ImageCardIcon,
        insertCommand: INSERT_IMAGE_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['image', 'img'],
        queryParams: ['src'],
        priority: 1,
        shortcut: '/image'
    },
    {
        section: 'Embeds',
        label: 'Unsplash',
        desc: '/unsplash [search term or url]',
        Icon: UnsplashIcon,
        insertCommand: OPEN_UNSPLASH_SELECTOR_COMMAND,
        insertParams: {
            triggerFileDialog: false
        },
        isHidden: ({config}: {config?: Record<string, unknown>}) => !config?.unsplash,
        matches: ['unsplash', 'uns'],
        queryParams: ['src'],
        priority: 3,
        shortcut: '/unsplash'
    },
    {
        label: 'GIF',
        desc: 'Search and embed gifs',
        Icon: GIFIcon,
        insertCommand: OPEN_GIF_SELECTOR_COMMAND,
        insertParams: {
            triggerFileDialog: false
        },
        matches: ['gif', 'giphy', 'klipy'],
        priority: 17,
        queryParams: ['src'],
        isHidden: ({config}: {config?: Record<string, unknown>}) => !config?.klipy,
        shortcut: '/gif'
    }];

    static uploadType = 'image';

    constructor(dataset: ImageNodeData = {}, key?: string) {
        super(dataset, key);

        const {previewSrc, triggerFileDialog, initialFile, selector, isImageHidden} = dataset;

        this.__previewSrc = previewSrc || '';
        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = !!(!dataset.src && triggerFileDialog);

        // passed via INSERT_MEDIA_COMMAND on drag+drop or paste
        this.__initialFile = initialFile ?? null;

        this.__selector = selector;
        this.__isImageHidden = isImageHidden ?? false;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.captionEditor && dataset.caption) {
            populateNestedEditor(this, '__captionEditor', `${dataset.caption}`); // we serialize with no wrapper
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

    get previewSrc() {
        const self = this.getLatest();
        return self.__previewSrc;
    }

    set previewSrc(previewSrc: string) {
        const writable = this.getWritable();
        writable.__previewSrc = previewSrc;
    }

    set triggerFileDialog(shouldTrigger: boolean) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
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
                json.caption = cleanedHtml ?? "";
            });
        }

        return json;
    }

    decorate() {
        const Selector = this.__selector;

        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={normalizeCardWidth(this.__cardWidth)}>
                {Selector && <Selector nodeKey={this.getKey()} />}

                {
                    !this.__isImageHidden && (
                        <ImageNodeComponent
                            altText={this.alt}
                            captionEditor={this.__captionEditor}
                            captionEditorInitialState={this.__captionEditorInitialState as string | undefined}
                            href={this.href}
                            initialFile={this.__initialFile}
                            nodeKey={this.getKey()}
                            previewSrc={this.previewSrc}
                            src={this.src}
                            triggerFileDialog={this.__triggerFileDialog}
                        />
                    )
                }
            </KoenigCardWrapper>
        );
    }
}

export const $createImageNode = (dataset: ImageNodeData) => {
    return new ImageNode(dataset);
};

export function $isImageNode(node: unknown): node is ImageNode {
    return node instanceof ImageNode;
}
