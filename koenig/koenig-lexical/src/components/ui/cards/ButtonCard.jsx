import React from 'react';
import PropTypes from 'prop-types';

export function ButtonCard({buttonText, buttonPlaceholder}) {
    return (
        <div className="justify-center h-10 flex items-center m-3">
            <Button value={buttonText} valuePlaceholder={buttonPlaceholder} />
        </div>
    );
}

ButtonCard.propTypes = {
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string
};

export function Button({value, valuePlaceholder}) {
    return (
        <button className={`bg-green text-white rounded font-sans text-[1.5rem] font-medium h-10 ${value ? 'opacity-100' : 'opacity-50' } ` } value={value} placeholder={valuePlaceholder}>
            <span className="px-5 h-10">{value || valuePlaceholder}</span>
        </button>
    );
}

Button.propTypes = {
    value: PropTypes.string,
    valuePlaceholder: PropTypes.string
};