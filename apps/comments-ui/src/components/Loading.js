import React from 'react';
import {ReactComponent as SpinnerIcon} from '../images/icons/spinner.svg';

function Loading() {
    return (
        <div className="flex items-center justify-center w-full h-32">
            <SpinnerIcon className="w-12 h-12 mb-6 fill-[rgb(225,225,225,0.9)] dark:fill-[rgba(255,255,255,0.6)]" />
        </div>
    );
}

export default Loading;
