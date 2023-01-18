import React from 'react';
import PropTypes from 'prop-types';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {ReactComponent as AudioPlaceholderIcon} from '../../../assets/icons/kg-audio-placeholder.svg';
import {ReactComponent as AudioFileIcon} from '../../../assets/icons/kg-audio-file.svg';
import {ReactComponent as FilePlaceholderIcon} from '../../../assets/icons/kg-file-placeholder.svg';

function EmptyAudioCard() {
    return (
        <MediaPlaceholder
            desc="Click to upload an audio file"
            Icon={AudioPlaceholderIcon}
            size='xsmall'
        />
    );
}

function PopulatedAudioCard({isSelected, title, placeholder, duration, ...args}) {
    return (
        <div className="flex rounded border border-grey/30 p-2" {...args}>
            <div className="group flex h-20 w-20 items-center justify-center rounded-sm bg-purple">
                {(isSelected && <FilePlaceholderIcon className="ease-inx h-6 w-6 text-white transition-all duration-75 group-hover:scale-105" />) || <AudioFileIcon className="h-6 w-6 text-white" />}
            </div>
            <div className="flex h-20 w-full flex-col justify-between px-4">
                {(isSelected || title) && <input value={title} placeholder={placeholder} className="font-sans text-lg font-bold text-black" />}
                <MediaPlayer duration={duration} theme='dark' />
            </div>
        </div>
    );
}

export function AudioCard({isPopulated, audioTitle, audioTitlePlaceholder, totalDuration, ...args}) {
    if (isPopulated) {
        return (
            <PopulatedAudioCard title={audioTitle} placeholder={audioTitlePlaceholder} {...args} duration={totalDuration} />
        );
    }
    return (
        <EmptyAudioCard />
    );
}

AudioCard.propTypes = {
    isPopulated: PropTypes.bool,
    audioTitle: PropTypes.string,
    totalDuration: PropTypes.string
};