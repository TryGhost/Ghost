import React from 'react';
export interface ButtonColorsType {
    Clear: string;
    Black: string;
    Green: string;
    Red: string;
}

export const ButtonColors: ButtonColorsType = {
    Clear: 'Clear',
    Black: 'Black',
    Green: 'Green',
    Red: 'Red'
};

export interface IButton {
    label: string;
    key?: string;
    color?: string;
    fullWidth?: boolean;
    link?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}

const Button: React.FC<IButton> = ({
    label,
    color,
    fullWidth,
    link,
    disabled,
    onClick,
    ...props
}) => {
    if (!color) {
        color = ButtonColors.Clear;
    }
    
    let styles = 'flex items-center justify-center rounded-sm text-sm';
    styles += ((link && color !== ButtonColors.Clear && color !== ButtonColors.Black) || (!link && color !== ButtonColors.Clear)) ? ' font-bold' : ' font-semibold';
    styles += !link ? ' px-4 h-9' : '';

    switch (color) {
    case ButtonColors.Black:
        styles += link ? ' text-black' : ' bg-black text-white';
        break;
    case ButtonColors.Green:
        styles += link ? ' text-green' : ' bg-green text-white';
        break;
    case ButtonColors.Red:
        styles += link ? ' text-red' : ' bg-red text-white';
        break;
    default:
        styles += link ? ' text-black' : ' bg-transparent text-black';
        break;
    }

    styles += (fullWidth && !link) ? ' w-full' : '';
    styles += (disabled) ? ' opacity-40' : ' cursor-pointer';

    return (
        <button
            className={styles}
            disabled={disabled}
            type="button"
            onClick={onClick}
            {...props}
        >
            {label}
        </button>
    );
};

export default Button;