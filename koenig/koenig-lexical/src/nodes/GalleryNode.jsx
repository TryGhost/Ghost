import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {GalleryNode as BaseGalleryNode} from '@tryghost/kg-default-nodes';
import {ReactComponent as GalleryCardIcon} from '../assets/icons/kg-card-type-gallery.svg';
import {GalleryNodeComponent} from './GalleryNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

// re-export here so we don't need to import from multiple places throughout the app
export const INSERT_GALLERY_COMMAND = createCommand();

export class GalleryNode extends BaseGalleryNode {
    __captionEditor;
    __captionEditorInitialState;

    static kgMenu = [{
        label: 'Gallery',
        desc: 'Create an image gallery',
        Icon: GalleryCardIcon,
        insertCommand: INSERT_GALLERY_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['gallery'],
        priority: 4
    }];

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {caption} = dataset;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});
        // populate nested editors on initial construction
        if (!dataset.captionEditor && caption) {
            populateNestedEditor(this, '__captionEditor', `<p>${caption}</p>`);
        }
    }

    getIcon() {
        return GalleryCardIcon;
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
            <KoenigCardWrapper nodeKey={this.getKey()} width={'wide'}>
                <GalleryNodeComponent
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createGalleryNode = (dataset) => {
    return new GalleryNode(dataset);
};

export function $isGalleryNode(node) {
    return node instanceof GalleryNode;
}

