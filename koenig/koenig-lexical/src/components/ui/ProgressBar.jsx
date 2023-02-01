import React from 'react';
import PropTypes from 'prop-types';

export function ProgressBar({style, fullWidth}) {
    return (
        <div className={`rounded-full bg-grey-200 ${fullWidth ? 'w-full' : 'mx-auto w-3/5'}`}>
            <div className="rounded-full bg-green py-1 text-center text-xs leading-none text-white" style={style}></div>
        </div>
    );
}

ProgressBar.propTypes = {
    style: PropTypes.object,
    fullWidth: PropTypes.bool
};