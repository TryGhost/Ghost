import React from 'react';
import PropTypes from 'prop-types';

export function ButtonCard({buttonText, buttonPlaceholder}) {
    return (
        <div className="m-3 flex h-10 items-center justify-center">
            <Button value={buttonText} valuePlaceholder={buttonPlaceholder} />
        </div>
    );
}

ButtonCard.propTypes = {
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string
};

export function Button({color, size, width, value, valuePlaceholder}) {
    return (
        <button className={`inline-block rounded font-sans font-medium ${(width === 'regular') || 'w-full' } ${value ? 'opacity-100' : 'opacity-50' } ${(color === 'light') ? 'bg-white text-black' : 'bg-green text-white'} `} value={value} placeholder={valuePlaceholder}>
            <span className={`block px-5 ${(size === 'small' ? 'h-10 text-md leading-[4rem]' : (size === 'medium' ? 'h-11 text-[1.6rem] leading-[4.4rem]' : 'h-12 text-lg leading-[4.8rem]'))}`}>{value || valuePlaceholder}</span>
        </button>
    );
}

Button.propTypes = {
    color: PropTypes.oneOf(['light', 'accent']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    width: PropTypes.oneOf(['regular', 'full']),
    value: PropTypes.string,
    valuePlaceholder: PropTypes.string
};

Button.defaultProps = {
    color: 'accent',
    size: 'small',
    width: 'regular',
    value: '',
    valuePlaceholder: 'Add button text'
};