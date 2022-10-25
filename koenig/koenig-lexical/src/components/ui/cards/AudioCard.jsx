import React from 'react';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as AudioPlaceholderIcon} from '../../../assets/icons/kg-audio-placeholder.svg';

function EmptyAudioCard() {
    return (
        <MediaPlaceholder
            desc="Click to upload an audio file"
            Icon={AudioPlaceholderIcon}
            size='small'
        />
    );
}

export function AudioCard() {
    return (
        <EmptyAudioCard />
    );
}