import PropTypes from 'prop-types';
import React from 'react';

export function Button({color, dataTestId, href, size, width, value, placeholder, type = 'button', target, ...other}) {
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
            className={`not-kg-prose inline-block rounded text-center font-sans font-medium ${(width === 'regular') || 'w-full' } ${value ? 'opacity-100' : 'opacity-50' } ${(color === 'light') ? 'bg-white text-black' : 'bg-green text-white'} `}
            data-testid={`${dataTestId}`}
            {...props}
        >
            <span
                className={`block px-5 ${(size === 'small' ? 'h-10 text-md leading-[4rem]' : (size === 'medium' ? 'h-11 text-[1.6rem] leading-[4.4rem]' : 'h-12 text-lg leading-[4.8rem]'))}`}
                data-testid={`${dataTestId}-span`}
            >
                {value || placeholder}
            </span>
        </Tag>
    );
}

Button.propTypes = {
    color: PropTypes.oneOf(['light', 'accent']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    width: PropTypes.oneOf(['regular', 'full']),
    value: PropTypes.string,
    placeholder: PropTypes.string,
    href: PropTypes.string,
    target: PropTypes.string
};

Button.defaultProps = {
    color: 'accent',
    size: 'small',
    width: 'regular',
    value: '',
    placeholder: 'Add button text'
};
