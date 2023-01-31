import React from 'react';
import {ReactComponent as GhostFavicon} from './icons/ghost-favicon.svg';

const Watermark = () => {
    return (
        <a href="https://github.com/TryGhost/Koenig/tree/main/packages/koenig-lexical" target="_blank" rel="nofollow ugc noopener noreferrer" className="absolute bottom-4 left-6 z-20 flex items-center rounded bg-white py-1 pr-2 pl-1 font-mono text-sm tracking-tight text-black">
            <GhostFavicon className="mr-2 h-6 w-6" />
            <span className="pr-1 font-bold tracking-wide">Koenig</span> 
            editor
        </a>
    );
};

export default Watermark;
