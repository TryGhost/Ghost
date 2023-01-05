import React from 'react';
import PropTypes from 'prop-types';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as AudioPlaceholderIcon} from '../../../assets/icons/kg-audio-placeholder.svg';
import {ReactComponent as AudioFileIcon} from '../../../assets/icons/kg-audio-file.svg';
import {ReactComponent as FilePlaceholderIcon} from '../../../assets/icons/kg-file-placeholder.svg';
import {ReactComponent as PlayIcon} from '../../../assets/icons/kg-play.svg';
import {ReactComponent as UnmuteIcon} from '../../../assets/icons/kg-unmute.svg';

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
                <div className="mt-auto flex w-full items-center py-2">
                    <PlayIcon className="mr-2 h-[1.4rem] w-[1.4rem] fill-black" />
                    <div className="mb-[1px] font-sans text-sm font-medium text-grey-600">
                        <span className="text-black">0:00 </span>
                        / {duration}
                    </div>
                    {/* <input type="range" max="100" value="0" className="relative grow bg-transparent mx-1" /> */}
                    <div className="relative mx-2 h-1 grow rounded bg-grey/30">
                        <button className="absolute left-0 top-[-6px] h-4 w-4 rounded-full border border-grey/50 bg-white shadow"></button>
                    </div>
                    <button type="button" className="mr-4 mb-[1px] px-1 font-sans text-sm font-medium text-black">1&#215;</button>
                    <button type="button">
                        <UnmuteIcon className="fill-black" />
                    </button>
                    <div className="relative ml-1 h-1 w-[80px] rounded bg-grey/30">
                        <div className="absolute left-0 h-1 w-[60%] rounded bg-black"></div>
                        <button className="absolute left-[55%] top-[-6px] h-4 w-4 rounded-full border border-grey/50 bg-white shadow"></button>
                    </div>
                </div>
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