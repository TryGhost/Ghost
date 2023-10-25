import Icon from './Icon';
import React, {HTMLProps} from 'react';
import clsx from 'clsx';
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
    linkWithPadding?: boolean;
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
    linkWithPadding = false,
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

    if (!unstyled) {
        className = clsx(
            'inline-flex items-center justify-center whitespace-nowrap rounded text-sm transition',
            ((link && color !== 'clear' && color !== 'black') || (!link && color !== 'clear')) ? 'font-bold' : 'font-semibold',
            !link ? `${size === 'sm' ? ' h-7 px-3 ' : ' h-[34px] px-4 '}` : '',
            (link && linkWithPadding) && '-m-1 p-1',
            className
        );

        switch (color) {
        case 'black':
            className = clsx(
                link ? 'text-black hover:text-grey-800 dark:text-white' : `bg-black text-white dark:bg-white dark:text-black ${!disabled && 'hover:bg-grey-900'}`,
                className
            );
            loadingIndicatorColor = 'light';
            break;
        case 'grey':
            className = clsx(
                link ? 'text-black hover:text-grey-800 dark:text-white' : `bg-grey-100 text-black dark:bg-grey-900 dark:text-white ${!disabled && 'hover:!bg-grey-300 dark:hover:!bg-grey-800'}`,
                className
            );
            loadingIndicatorColor = 'dark';
            break;
        case 'green':
            className = clsx(
                link ? ' text-green hover:text-green-400' : ` bg-green text-white ${!disabled && 'hover:bg-green-400'}`,
                className
            );
            loadingIndicatorColor = 'light';
            break;
        case 'red':
            className = clsx(
                link ? 'text-red hover:text-red-400' : `bg-red text-white ${!disabled && 'hover:bg-red-400'}`,
                className
            );
            loadingIndicatorColor = 'light';
            break;
        case 'white':
            className = clsx(
                link ? 'text-white hover:text-white dark:text-black dark:hover:text-grey-800' : `bg-white text-black dark:bg-black dark:text-white`,
                className
            );
            loadingIndicatorColor = 'dark';
            break;
        case 'outline':
            className = clsx(
                link ? 'text-black hover:text-grey-800 dark:text-white' : `border border-grey-300 bg-transparent text-black dark:border-grey-800 dark:text-white ${!disabled && 'hover:!border-black dark:hover:!border-white'}`,
                className
            );
            loadingIndicatorColor = 'dark';
            break;
        default:
            className = clsx(
                link ? ' text-black hover:text-grey-800 dark:text-white' : ` text-black dark:text-white dark:hover:bg-grey-900 ${!disabled && 'hover:bg-grey-200'}`,
                className
            );
            loadingIndicatorColor = 'dark';
            break;
        }

        className = clsx(
            (fullWidth && !link) && ' w-full',
            disabled ? 'opacity-40' : 'cursor-pointer',
            className
        );
    }

    const iconClasses = label && icon && !hideLabel ? 'mr-1.5' : '';

    let labelClasses = '';
    labelClasses += (label && hideLabel) ? 'sr-only' : '';
    labelClasses += loading ? 'invisible' : '';

    const buttonChildren = <>
        {icon && <Icon className={iconClasses} colorClass={iconColorClass} name={icon} size={size === 'sm' ? 'sm' : 'md'} />}
        <span className={labelClasses}>{label}</span>
        {loading && <div className='absolute flex'><LoadingIndicator color={loadingIndicatorColor} size={size}/><span className='sr-only'>Loading...</span></div>}
    </>;

    const buttonElement = React.createElement(tag, {className: className,
        disabled: disabled,
        type: 'button',
        onClick: onClick,
        ...props}, buttonChildren);

    return buttonElement;
};

export default Button;
