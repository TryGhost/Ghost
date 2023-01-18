import React from 'react';
import {ReactComponent as PlayIcon} from '../../assets/icons/kg-play.svg';
import {ReactComponent as UnmuteIcon} from '../../assets/icons/kg-unmute.svg';

export function MediaPlayer({type, duration, theme, ...args}) {
    return (
        <div className="mt-auto flex w-full items-center py-2" {...args}>
            <PlayIcon className={`mr-2 h-[1.4rem] w-[1.4rem] ${theme === 'light' ? 'fill-white' : 'fill-black'}`} />
            <div className="mb-[1px] font-sans text-sm font-medium text-grey-600">
                <span className={`${theme === 'light' ? 'text-white' : 'text-black'}`}>0:00 </span>
            / {duration}
            </div>
            {/* <input type="range" max="100" value="0" className="relative grow bg-transparent mx-1" /> */}
            <div className={`relative mx-2 h-1 grow rounded ${theme === 'light' ? 'bg-white/40' : 'bg-grey/30'}`}>
                <button className="absolute left-0 top-[-6px] h-4 w-4 rounded-full border border-grey/50 bg-white shadow"></button>
            </div>
            <button type="button" className={`mr-4 mb-[1px] px-1 font-sans text-sm font-medium ${theme === 'light' ? 'text-white' : 'text-black'}`}>1&#215;</button>
            <button type="button">
                <UnmuteIcon className={`${theme === 'light' ? 'fill-white' : 'fill-black'}`} />
            </button>
            <div className={`relative ml-1 h-1 w-[80px] rounded ${theme === 'light' ? 'bg-white/40' : 'bg-grey/30'}`}>
                <div className={`absolute left-0 h-1 w-[60%] rounded ${theme === 'light' ? 'bg-white' : 'bg-black'}`}></div>
                <button className="absolute left-[55%] top-[-6px] h-4 w-4 rounded-full border border-grey/50 bg-white shadow"></button>
            </div>
        </div>
    );
}