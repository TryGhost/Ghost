import KoenigCardWrapper from '../components/KoenigCardWrapper';
import React from 'react';
import {VideoNode as BaseVideoNode, INSERT_VIDEO_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as VideoCardIcon} from '../assets/icons/kg-card-type-video.svg';
import {VideoNodeComponent} from './VideoNodeComponent';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_VIDEO_COMMAND} from '@tryghost/kg-default-nodes';

export class VideoNode extends BaseVideoNode {
    // transient properties used to control node behaviour
    __triggerFileDialog = false;
    __initialFile = null;

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
    }

    setTriggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        return writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                <VideoNodeComponent
                    caption={this.getCaption()}
                    cardWidth={this.getCardWidth()}
                    customThumbnail={this.getCustomThumbnailSrc()}
                    initialFile={this.__initialFile}
                    isLoopChecked={this.getLoop()}
                    nodeKey={this.getKey()}
                    thumbnail={this.getThumbnailSrc()}
                    totalDuration={this.getFormattedDuration()}
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
