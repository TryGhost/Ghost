import React from 'react';
import {ReactComponent as SpinnerIcon} from '../images/icons/spinner.svg';

function Loading() {
    return (
        <div className="ghost-display flex items-center justify-center w-full h-36">
            <SpinnerIcon className="w-12 h-12 mb-6 fill-[rgba(0,0,0,0.3)] dark:fill-[rgba(255,255,255,0.6)]" />
        </div>
    );
}

export default Loading;
