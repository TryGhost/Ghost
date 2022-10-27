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
        <div className="flex p-2 border border-grey/30 rounded" {...args}>
            <div className="group w-20 h-20 bg-purple rounded-sm flex items-center justify-center">
                {(isSelected && <FilePlaceholderIcon className="ease-inx text-white w-6 h-6 group-hover:scale-105 transition-all duration-75" />) || <AudioFileIcon className="text-white w-6 h-6" />}
            </div>
            <div className="flex flex-col justify-between px-4 w-full h-20">
                {(isSelected || title) && <input value={title} placeholder={placeholder} className="font-sans text-lg font-bold text-black" />}
                <div className="flex items-center mt-auto py-2 w-full">
                    <PlayIcon className="w-[1.4rem] h-[1.4rem] fill-black mr-2" />
                    <div className="font-sans text-sm font-medium text-grey-600 mb-[1px]">
                        <span className="text-black">0:00 </span>
                        / {duration}
                    </div>
                    {/* <input type="range" max="100" value="0" className="relative grow bg-transparent mx-1" /> */}
                    <div className="relative h-1 grow bg-grey/30 rounded mx-2">
                        <button className="absolute left-0 h-4 w-4 rounded-full bg-white shadow border border-grey/50 top-[-6px]"></button>
                    </div>
                    <button type="button" className="font-sans text-sm font-medium text-black px-1 mr-4 mb-[1px]">1&#215;</button>
                    <button type="button">
                        <UnmuteIcon className="fill-black" />
                    </button>
                    <div className="relative h-1 w-[80px] bg-grey/30 rounded ml-1">
                        <div className="absolute left-0 h-1 w-[60%] bg-black rounded"></div>
                        <button className="absolute left-[55%] h-4 w-4 rounded-full bg-white shadow border border-grey/50 top-[-6px]"></button>
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