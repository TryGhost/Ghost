import React from 'react';
import {VideoNode as BaseVideoNode, INSERT_VIDEO_COMMAND} from '@tryghost/kg-default-nodes';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ReactComponent as VideoCardIcon} from '../assets/icons/kg-card-type-video.svg';
import {VideoNodeComponent} from './VideoNodeComponent';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_VIDEO_COMMAND} from '@tryghost/kg-default-nodes';

export class VideoNode extends BaseVideoNode {
    // transient properties used to control node behaviour
    __triggerFileDialog = false;

    static kgMenu = [{
        label: 'Video',
        desc: 'Upload and play a video file',
        Icon: VideoCardIcon,
        insertCommand: INSERT_VIDEO_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['video']
    }];

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = !dataset.src && triggerFileDialog;
    }

    setTriggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        return writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                <VideoNodeComponent
                    nodeKey={this.getKey()}
                    thumbnailSrc={this.getThumbnailSrc()}
                    customThumbnail={this.getCustomThumbnailSrc()}
                    totalDuration={this.getFormattedDuration()}
                    caption={this.getCaption()}
                    cardWidth={this.getCardWidth()}
                    isLoopChecked={this.getLoop()}
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
