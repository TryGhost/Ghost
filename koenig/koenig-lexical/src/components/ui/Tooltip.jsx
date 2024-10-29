import React from 'react';

export function Tooltip({label, shortcutKeys}) {
    return (
        <div className={`invisible absolute -top-8 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md bg-black py-1 font-sans text-2xs font-medium text-white group-hover:visible dark:bg-grey-900 ${shortcutKeys ? 'pl-[1rem] pr-1' : 'px-[1rem]'}`}>
            <span>{label}</span>
            {shortcutKeys && shortcutKeys.map(k => (
                <div key={k} className="rounded bg-grey-900 px-2 text-2xs text-white dark:bg-grey-950">{k}</div>
            ))}
        </div>
    );
}