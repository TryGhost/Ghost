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

export function CalloutCard({backgroundColor, value, valuePlaceholder, isEditing}) {
    return (
        <div className={`flex items-center rounded border py-5 px-7 ${CALLOUT_COLORS[backgroundColor]} `}>
            <button className={`mr-2 h-8 rounded px-2 text-xl ${isEditing ? 'hover:bg-grey-500/20' : ''} ` }>&#128161;</button>
            <input className="w-full bg-transparent font-serif text-xl font-normal text-black" value={value} placeholder={valuePlaceholder} />
        </div>
    );
}

CalloutCard.propTypes = {
    backgroundColor: PropTypes.oneOf(['grey', 'white', 'blue', 'green', 'yellow', 'red', 'pink', 'purple']),
    value: PropTypes.string,
    valuePlaceholder: PropTypes.string,
    isEditing: PropTypes.bool
};

CalloutCard.defaultProps = {
    backgroundColor: 'green'
};