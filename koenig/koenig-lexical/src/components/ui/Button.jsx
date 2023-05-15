import PropTypes from 'prop-types';
import React from 'react';

export function Button({color, dataTestId, href, size, width, rounded, value, placeholder, type = 'button', target, ...other}) {
    const Tag = href ? 'a' : 'button';
    const props = {
        type: href ? null : type,
        href: href || null,
        rel: target === '_blank' ? 'noopener noreferrer' : null,
        target: target || null,
        ...other
    };

    return (
        <Tag
            className={`not-kg-prose inline-block shrink-0 text-center font-sans font-medium ${(width === 'regular') || 'w-full' } ${rounded && 'rounded'} ${value ? 'opacity-100' : 'opacity-50' } ${(color === 'white') ? 'bg-white text-black' : (color === 'grey') ? 'bg-grey-200 text-black' : (color === 'black') ? 'bg-black text-white' : 'bg-green text-white'} `}
            data-testid={`${dataTestId}`}
            {...props}
        >
            <span
                className={`block ${(size === 'small' ? 'h-10 px-5 text-md leading-[4rem]' : (size === 'medium' ? 'h-11 px-5 text-[1.6rem] leading-[4.4rem]' : (size === 'large') ? 'h-12 px-6 text-lg leading-[4.8rem]' : 'h-[5.2rem] px-6 text-lg leading-[5.2rem]'))}`}
                data-testid={`${dataTestId}-span`}
            >
                {value || placeholder}
            </span>
        </Tag>
    );
}

Button.propTypes = {
    color: PropTypes.oneOf(['white', 'grey', 'black', 'accent']),
    size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge']),
    width: PropTypes.oneOf(['regular', 'full']),
    rounded: PropTypes.bool,
    value: PropTypes.string,
    placeholder: PropTypes.string,
    href: PropTypes.string,
    target: PropTypes.string
};

Button.defaultProps = {
    color: 'accent',
    size: 'small',
    width: 'regular',
    rounded: true,
    value: '',
    placeholder: 'Add button text'
};
