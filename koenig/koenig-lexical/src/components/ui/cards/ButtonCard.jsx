import React from 'react';
import PropTypes from 'prop-types';

export function ButtonCard({value, valuePlaceholder, setValue}) {
    return (
        <div className="justify-center h-10 flex items-center m-3">
            <button className={`bg-green text-white rounded font-sans text-[1.5rem] font-medium h-10 ${value ? 'opacity-100' : 'opacity-50' } ` } value={value} placeholder={valuePlaceholder} onClick={setValue}>
                <span className="px-5 h-10">{value || valuePlaceholder}</span>
            </button>
        </div>
    );
}

ButtonCard.propTypes = {
    value: PropTypes.string,
    valuePlaceholder: PropTypes.string
};