import KoenigCardWrapper from '../components/KoenigCardWrapper';

import AudioCardIcon from '../assets/icons/kg-card-type-audio.svg?react';
import {AudioNodeComponent} from './AudioNodeComponent';
import {AudioNode as BaseAudioNode} from '@tryghost/kg-default-nodes';
import {createCommand} from 'lexical';

export const INSERT_AUDIO_COMMAND = createCommand();

export class AudioNode extends BaseAudioNode {
    __triggerFileDialog = false;
    __initialFile = null;

    static kgMenu = [{
        label: 'Audio',
        desc: 'Upload and play an audio file',
        Icon: AudioCardIcon,
        insertCommand: INSERT_AUDIO_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['audio'],
        priority: 14,
        shortcut: '/audio'
    }];

    static uploadType = 'audio';

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;
        this.__initialFile = initialFile || null;
    }

    getIcon() {
        return AudioCardIcon;
    }

    set triggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <AudioNodeComponent
                    duration={this.duration}
                    initialFile={this.__initialFile}
                    nodeKey={this.getKey()}
                    src={this.src}
                    thumbnailSrc={this.thumbnailSrc}
                    title={this.title}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createAudioNode = (dataset) => {
    return new AudioNode(dataset);
};

export function $isAudioNode(node) {
    return node instanceof AudioNode;
}
