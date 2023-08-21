import Icon from './Icon';
import React, {HTMLProps} from 'react';

export type ButtonColor = 'clear' | 'grey' | 'black' | 'green' | 'red' | 'white' | 'outline';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends Omit<HTMLProps<HTMLButtonElement>, 'label' | 'size' | 'children'> {
    size?: ButtonSize;
    label?: React.ReactNode;
    hideLabel?: boolean;
    icon?: string;
    iconColorClass?: string;
    key?: string;
    color?: ButtonColor;
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
            styles += link ? ' text-black hover:text-grey-800' : ` bg-black text-white ${!disabled && 'hover:bg-grey-900'}`;
            break;
        case 'grey':
            styles += link ? ' text-black hover:text-grey-800' : ` bg-grey-100 text-black ${!disabled && 'hover:!bg-grey-300'}`;
            break;
        case 'green':
            styles += link ? ' text-green hover:text-green-400' : ` bg-green text-white ${!disabled && 'hover:bg-green-400'}`;
            break;
        case 'red':
            styles += link ? ' text-red hover:text-red-400' : ` bg-red text-white ${!disabled && 'hover:bg-red-400'}`;
            break;
        case 'white':
            styles += link ? ' text-white hover:text-white' : ` bg-white text-black`;
            break;
        case 'outline':
            styles += link ? ' text-black hover:text-grey-800' : ` border border-grey-300 bg-transparent text-black ${!disabled && 'hover:!border-black'}`;
            break;
        default:
            styles += link ? ' text-black hover:text-grey-800' : ` text-black ${!disabled && 'hover:bg-grey-200'}`;
            break;
        }

        styles += (fullWidth && !link) ? ' w-full' : '';
        styles += (disabled) ? ' opacity-40' : ' cursor-pointer';
    }

    styles += ` ${className}`;

    const iconClasses = label && icon ? 'mr-1.5' : '';

    const buttonChildren = <>
        {icon && <Icon className={iconClasses} colorClass={iconColorClass} name={icon} size={size === 'sm' ? 'sm' : 'md'} />}
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
