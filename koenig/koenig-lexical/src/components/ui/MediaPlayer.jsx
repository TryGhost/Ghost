import PlayIcon from '../../assets/icons/kg-play.svg?react';
import PropTypes from 'prop-types';
import React from 'react';
import UnmuteIcon from '../../assets/icons/kg-unmute.svg?react';

export function MediaPlayer({type, duration, theme, ...args}) {
    return (
        <div className="mt-auto flex w-full items-center py-2" {...args}>
            <PlayIcon className={`mr-2 size-[1.4rem] ${theme === 'light' ? 'fill-white' : 'fill-black dark:fill-white'}`} />
            <div className={`mb-[1px] font-sans text-sm font-medium ${theme === 'light' ? 'text-white/60' : 'text-black/50 dark:text-white/50'} `}>
                <span className={`${theme === 'light' ? 'text-white' : 'text-black dark:text-white'}`}>0:00 </span>
                / <span data-testid="media-duration">{duration}</span>
            </div>
            {/* <input type="range" max="100" value="0" className="relative grow bg-transparent mx-1" /> */}
            <div className={`relative mx-2 h-1 grow rounded ${theme === 'light' ? 'bg-white/40' : 'bg-grey/30 dark:bg-white/40'}`}>
                <button className="absolute left-0 top-[-6px] size-4 rounded-full border border-grey/50 bg-white shadow" type="button"></button>
            </div>
            <button className={`mb-[1px] mr-4 px-1 font-sans text-sm font-medium ${theme === 'light' ? 'text-white' : 'text-current'}`} type="button">1&#215;</button>
            <button type="button">
                <UnmuteIcon className={`${theme === 'light' ? 'fill-white' : 'fill-black dark:fill-black'}`} />
            </button>
            <div className={`relative ml-1 h-1 w-[80px] rounded ${theme === 'light' ? 'bg-white/40' : 'bg-grey/30 dark:bg-white/40'}`}>
                <div className={`absolute left-0 h-1 w-[60%] rounded ${theme === 'light' ? 'bg-white' : 'bg-black dark:bg-white'}`}></div>
                <button className="absolute left-[55%] top-[-6px] size-4 rounded-full border border-grey/50 bg-white shadow"type="button"></button>
            </div>
        </div>
    );
}

MediaPlayer.propTypes = {
    theme: PropTypes.oneOf(['light', 'dark'])
};
