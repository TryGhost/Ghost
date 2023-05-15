import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$generateHtmlFromNodes} from '@lexical/html';
import {GalleryNode as BaseGalleryNode, INSERT_GALLERY_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as GalleryCardIcon} from '../assets/icons/kg-card-type-gallery.svg';
import {GalleryNodeComponent} from './GalleryNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {createEditor} from 'lexical';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_GALLERY_COMMAND} from '@tryghost/kg-default-nodes';

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

