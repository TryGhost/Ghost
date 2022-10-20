import React from 'react';
import PropTypes from 'prop-types';

export const CALLOUT_COLORS = {
    grey: 'bg-grey/10 border-transparent',
    white: 'bg-white border-grey/30',
    blue: 'bg-blue/10 border-transparent',
    green: 'bg-green/10 border-transparent',
    yellow: 'bg-yellow/10 border-transparent',
    red: 'bg-red/10 border-transparent',
    pink: 'bg-pink/10 border-transparent',
    purple: 'bg-purple/10 border-transparent'
};

export function CalloutCard({backgroundColor, value, valuePlaceholder}) {
    return (
        <div className={`flex items-center py-5 px-7 rounded border ${CALLOUT_COLORS[backgroundColor]} `}>
            <button className="text-xl mr-2 px-2 rounded h-8 hover:bg-grey-300">&#128161;</button>
            <input className="w-full bg-transparent font-serif font-normal text-xl text-black" value={value} placeholder={valuePlaceholder} />
        </div>
    );
}

CalloutCard.propTypes = {
    backgroundColor: PropTypes.oneOf(['grey', 'white', 'blue', 'green', 'yellow', 'red', 'pink', 'purple']),
    value: PropTypes.string,
    valuePlaceholder: PropTypes.string
};

CalloutCard.defaultProps = {
    backgroundColor: 'green'
};