import Icon from './Icon';
import React from 'react';

export type ButtonColor = 'clear' | 'grey' | 'black' | 'green' | 'red' | 'white';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps {
    size?: ButtonSize;
    label?: React.ReactNode;
    hideLabel?: boolean;
    icon?: string;
    iconColorClass?: string;
    key?: string;
    color?: string;
    fullWidth?: boolean;
    link?: boolean;
    disabled?: boolean;
    unstyled?: boolean;
    className?: string;
    tag?: string;
    onClick?: (e?:React.MouseEvent<HTMLElement>) => void;
}

const Button: React.FC<ButtonProps> = ({
    size = 'md',
    label = '',
    hideLabel = false,
    icon = '',
    iconColorClass = 'text-black',
    color = 'clear',
    fullWidth,
    link,
    disabled,
    unstyled = false,
    className = '',
    tag = 'button',
    onClick,
    ...props
}) => {
    if (!color) {
        color = 'clear';
    }

    let styles = '';

    if (!unstyled) {
        styles += ' transition whitespace-nowrap flex items-center justify-center rounded-sm text-sm';
        styles += ((link && color !== 'clear' && color !== 'black') || (!link && color !== 'clear')) ? ' font-bold' : ' font-semibold';
        styles += !link ? `${size === 'sm' ? ' px-3 h-7 ' : ' px-4 h-[34px] '}` : '';

        switch (color) {
        case 'black':
            styles += link ? ' text-black hover:text-grey-800' : ' bg-black text-white hover:bg-grey-900';
            break;
        case 'grey':
            styles += link ? ' text-black hover:text-grey-800' : ' bg-grey-100 text-black hover:!bg-grey-300';
            break;
        case 'green':
            styles += link ? ' text-green hover:text-green-400' : ' bg-green text-white hover:bg-green-400';
            break;
        case 'red':
            styles += link ? ' text-red hover:text-red-400' : ' bg-red text-white hover:bg-red-400';
            break;
        case 'white':
            styles += link ? ' text-white hover:text-white' : ' bg-white text-black';
            break;
        default:
            styles += link ? ' text-black hover:text-grey-800' : ' text-black hover:bg-grey-200';
            break;
        }

        styles += (fullWidth && !link) ? ' w-full' : '';
        styles += (disabled) ? ' opacity-40' : ' cursor-pointer';
    }

    styles += ` ${className}`;

    const buttonChildren = <>
        {icon && <Icon colorClass={iconColorClass} name={icon} size={size === 'sm' ? 'sm' : 'md'} />}
        {(label && hideLabel) ? <span className="sr-only">{label}</span> : label}
    </>;
    const buttonElement = React.createElement(tag, {className: styles,
        disabled: disabled,
        type: 'button',
        onClick: onClick,
        ...props}, buttonChildren);

    return buttonElement;
};

export default Button;
