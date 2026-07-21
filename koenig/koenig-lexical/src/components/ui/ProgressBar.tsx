import React from 'react';

export interface ProgressBarProps {
    style?: React.CSSProperties;
    fullWidth?: boolean;
    bgStyle?: string;
}

export function ProgressBar({style, fullWidth, bgStyle}: ProgressBarProps) {
    return (
        <div className={`rounded-full bg-grey-200 dark:bg-black ${fullWidth ? 'w-full' : 'mx-auto w-3/5'} ${bgStyle === 'transparent' ? 'bg-white/30' : 'bg-grey-200'}`} data-testid="progress-bar">
            <div className="rounded-full bg-green py-1 text-center text-2xs leading-none text-white" style={style}></div>
        </div>
    );
}
