import PropTypes from 'prop-types';
import React from 'react';
import clsx from 'clsx';

export function Button({color, dataTestId, href, size, width, rounded, shrink, value, placeholder, type = 'button', disabled = false, target, ...other}) {
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
            className={clsx(
                'not-kg-prose inline-block cursor-pointer text-center font-sans font-medium',
                (!shrink && 'shrink-0'), // This is for dynamic buttons that need to wrap onto a new line if width exceeds editor width, such as the ButtonCard
                width === 'regular' || 'w-full',
                rounded && 'rounded-md',
                value ? 'opacity-100' : 'opacity-50',
                color === 'white' && 'bg-white text-black',
                color === 'grey' && 'bg-grey-200 text-black',
                color === 'black' && 'bg-black text-white',
                color === 'accent' && 'bg-accent text-white',
                !['white', 'grey', 'black', 'accent'].includes(color) && 'bg-green text-white')}
            data-testid={`${dataTestId}`}
            disabled={disabled}
            {...props}
        >
            <span
                className={clsx(
                    'block',
                    size === 'small' && 'px-5 py-[1rem] text-md leading-[1.4]',
                    size === 'medium' && 'px-5 py-2 text-[1.6rem]',
                    size === 'large' && 'px-6 py-3 text-lg leading-[1.35]'
                )}
                data-testid={`${dataTestId}-span`}
            >
                {value || placeholder}
            </span>
        </Tag>
    );
}

Button.propTypes = {
    color: PropTypes.oneOf(['white', 'grey', 'black', 'accent']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    width: PropTypes.oneOf(['regular', 'full']),
    rounded: PropTypes.bool,
    value: PropTypes.string,
    placeholder: PropTypes.string,
    href: PropTypes.string,
    target: PropTypes.string,
    disabled: PropTypes.bool
};

Button.defaultProps = {
    color: 'accent',
    size: 'small',
    width: 'regular',
    rounded: true,
    shrink: false,
    value: '',
    placeholder: 'Add button text',
    disabled: false
};
