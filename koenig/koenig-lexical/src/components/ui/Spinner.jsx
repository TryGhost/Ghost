import PropTypes from 'prop-types';
import React from 'react';

export function Spinner({size}) {
    let sizeClasses = '';
    switch (size) {
    case 'mini':
        sizeClasses = 'h-3 w-3';
        break;
    default:
        sizeClasses = 'h-5 w-5';
        break;
    }

    return (
        <div className='' data-testid="spinner">
            <svg className={`${sizeClasses} animate-spin text-grey-500 dark:text-grey-200`} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{
                    opacity: '0.3'
                }}></circle>
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
            </svg>
        </div>
    );
}

Spinner.propTypes = {
    colorClass: PropTypes.string,
    size: PropTypes.string
};
