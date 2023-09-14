import Icon from './Icon';
import React, {HTMLProps} from 'react';
import {LoadingIndicator, LoadingIndicatorColor, LoadingIndicatorSize} from './LoadingIndicator';

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
    loading?: boolean;
    loadingIndicatorSize?: LoadingIndicatorSize;
    loadingIndicatorColor?: LoadingIndicatorColor;
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
    loading = false,
    loadingIndicatorColor,
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
            styles += link ? ' text-black dark:text-white hover:text-grey-800' : ` bg-black text-white dark:bg-white dark:text-black ${!disabled && 'hover:bg-grey-900'}`;
            loadingIndicatorColor = 'light';
            break;
        case 'grey':
            styles += link ? ' text-black dark:text-white hover:text-grey-800' : ` bg-grey-100 text-black dark:bg-grey-900 dark:text-white ${!disabled && 'hover:!bg-grey-300 dark:hover:!bg-grey-800'}`;
            loadingIndicatorColor = 'dark';
            break;
        case 'green':
            styles += link ? ' text-green hover:text-green-400' : ` bg-green text-white ${!disabled && 'hover:bg-green-400'}`;
            loadingIndicatorColor = 'light';
            break;
        case 'red':
            styles += link ? ' text-red hover:text-red-400' : ` bg-red text-white ${!disabled && 'hover:bg-red-400'}`;
            loadingIndicatorColor = 'light';
            break;
        case 'white':
            styles += link ? ' text-white hover:text-white dark:text-black dark:hover:text-grey-800' : ` bg-white dark:bg-black text-black dark:text-white`;
            loadingIndicatorColor = 'dark';
            break;
        case 'outline':
            styles += link ? ' text-black dark:text-white hover:text-grey-800' : `text-black border border-grey-300 bg-transparent dark:border-grey-800 dark:text-white ${!disabled && 'hover:!border-black dark:hover:!border-white'}`;
            loadingIndicatorColor = 'dark';
            break;
        default:
            styles += link ? ' text-black dark:text-white hover:text-grey-800' : ` text-black dark:text-white dark:hover:bg-grey-900 ${!disabled && 'hover:bg-grey-200'}`;
            loadingIndicatorColor = 'dark';
            break;
        }

        styles += (fullWidth && !link) ? ' w-full' : '';
        styles += (disabled) ? ' opacity-40' : ' cursor-pointer';
    }

    styles += ` ${className}`;

    const iconClasses = label && icon && !hideLabel ? 'mr-1.5' : '';

    let labelClasses = '';
    labelClasses += (label && hideLabel) ? 'sr-only' : '';
    labelClasses += loading ? 'invisible' : '';

    const buttonChildren = <>
        {icon && <Icon className={iconClasses} colorClass={iconColorClass} name={icon} size={size === 'sm' ? 'sm' : 'md'} />}
        <span className={labelClasses}>{label}</span>
        {loading && <div className='absolute flex'><LoadingIndicator color={loadingIndicatorColor} size={size}/><span className='sr-only'>Loading...</span></div>}
    </>;
    
    const buttonElement = React.createElement(tag, {className: styles,
        disabled: disabled,
        type: 'button',
        onClick: onClick,
        ...props}, buttonChildren);

    return buttonElement;
};

export default Button;
