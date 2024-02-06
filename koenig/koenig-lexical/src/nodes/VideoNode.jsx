import React from 'react';
import VideoCardIcon from '../assets/icons/kg-card-type-video.svg?react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {VideoNode as BaseVideoNode} from '@tryghost/kg-default-nodes';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {VideoNodeComponent} from './VideoNodeComponent';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_VIDEO_COMMAND = createCommand();

export class VideoNode extends BaseVideoNode {
    // transient properties used to control node behaviour
    __triggerFileDialog = false;
    __initialFile = null;
    __captionEditor;
    __captionEditorInitialState;

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

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = !dataset.src && triggerFileDialog;

        this.__initialFile = initialFile || null;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});
        // populate nested editors on initial construction
        if (!dataset.captionEditor && dataset.caption) {
            populateNestedEditor(this, '__captionEditor', `${dataset.caption}`);
        }
    }

    set triggerFileDialog(shouldTrigger) {
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
                json.caption = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.cardWidth}>
                <VideoNodeComponent
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState}
                    cardWidth={this.cardWidth}
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

export const $createVideoNode = (dataset) => {
    return new VideoNode(dataset);
};

export function $isVideoNode(node) {
    return node instanceof VideoNode;
}
