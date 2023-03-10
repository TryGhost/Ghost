import PropTypes from 'prop-types';
import React from 'react';

export function ProgressBar({style, fullWidth, bgStyle}) {
    return (
        <div className={`rounded-full bg-grey-200 ${fullWidth ? 'w-full' : 'mx-auto w-3/5'} ${bgStyle === 'transparent' ? 'bg-white/30' : 'bg-grey-200'}`} data-testid="progress-bar">
            <div className="rounded-full bg-green py-1 text-center text-xs leading-none text-white" style={style}></div>
        </div>
    );
}

ProgressBar.propTypes = {
    style: PropTypes.object,
    fullWidth: PropTypes.bool
};
