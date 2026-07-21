import VideoCardIcon from '../assets/icons/kg-card-type-video.svg?react';
import {$generateHtmlFromNodes} from '@lexical/html';
import {VideoNode as BaseVideoNode, normalizeCardWidth, type VideoData} from '@tryghost/kg-default-nodes';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index';
import {VideoNodeComponent} from './VideoNodeComponent';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';
import type {LexicalEditor} from 'lexical';

export type VideoNodeData = VideoData & {
    captionEditor?: LexicalEditor;
    captionEditorInitialState?: unknown;
    initialFile?: File | null;
    triggerFileDialog?: boolean;
};

export const INSERT_VIDEO_COMMAND = createCommand<VideoNodeData>();

export class VideoNode extends BaseVideoNode {
    // transient properties used to control node behaviour
    __triggerFileDialog: boolean = false;
    __initialFile: File | null = null;
    __captionEditor!: LexicalEditor;
    __captionEditorInitialState: unknown;

    static kgMenu = [{
        label: 'Video',
        desc: 'Upload and play a video file',
        Icon: VideoCardIcon,
        insertCommand: INSERT_VIDEO_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['video'],
        priority: 13,
        shortcut: '/video'
    }];

    static uploadType = 'video';

    getIcon() {
        return VideoCardIcon;
    }

    constructor(dataset: VideoNodeData = {}, key?: string) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = !dataset.src && !!triggerFileDialog;

        this.__initialFile = initialFile || null;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});
        // populate nested editors on initial construction
        if (!dataset.captionEditor && dataset.caption) {
            populateNestedEditor(this, '__captionEditor', `${dataset.caption}`);
        }
    }

    set triggerFileDialog(shouldTrigger: boolean) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
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
                json.caption = cleanedHtml ?? "";
            });
        }

        return json;
    }

    decorate() {
        const cardWidth = normalizeCardWidth(this.cardWidth) ?? 'regular';

        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={cardWidth}>
                <VideoNodeComponent
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState as string | undefined}
                    cardWidth={cardWidth}
                    customThumbnail={this.customThumbnailSrc}
                    initialFile={this.__initialFile}
                    isLoopChecked={this.loop}
                    nodeKey={this.getKey()}
                    thumbnail={this.thumbnailSrc}
                    totalDuration={this.formattedDuration}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createVideoNode = (dataset: VideoNodeData = {}) => {
    return new VideoNode(dataset);
};

export function $isVideoNode(node: unknown): node is VideoNode {
    return node instanceof VideoNode;
}
