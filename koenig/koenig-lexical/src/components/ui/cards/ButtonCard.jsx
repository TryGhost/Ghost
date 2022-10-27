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

export function Button({color, size, value, valuePlaceholder}) {
    return (
        <button className={`inline-block rounded font-sans font-medium ${value ? 'opacity-100' : 'opacity-50' } ${(color === 'light') ? 'bg-white text-black' : 'bg-green text-white'} `} value={value} placeholder={valuePlaceholder}>
            <span className={`block px-5 ${(size === 'small' ? 'h-10 leading-[4rem] text-md' : (size === 'medium' ? 'h-11 leading-[4.4rem] text-[1.6rem]' : 'h-12 leading-[4.8rem] text-lg'))}`}>{value || valuePlaceholder}</span>
        </button>
    );
}

Button.propTypes = {
    color: PropTypes.oneOf(['light', 'accent']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    value: PropTypes.string,
    valuePlaceholder: PropTypes.string
};

Button.defaultProps = {
    color: 'accent',
    size: 'small',
    value: '',
    valuePlaceholder: 'Add button text'
};