import React from "react";

export enum ButtonColors {
    Clear = "Clear",
    Black = "Black",
    Green = "Green",
    Red = "Red"
};

export interface ButtonProps {
    label: string;
    color?: ButtonColors;
    fullWidth?: boolean;
    link?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    label,
    color, 
    fullWidth, 
    link,
    ...props
}) => {

    let buttonColor: string;
    const fontWeight: string = (link || (color != ButtonColors.Clear && color)) ? 'font-bold' : 'font-medium';
    const padding: string = !link ? 'px-4 h-9' : '';

    switch (color) {
        case ButtonColors.Black:
            buttonColor = link ? 'text-black' : 'bg-black text-white';
            break;
        case ButtonColors.Green:
            buttonColor = link ? 'text-green' : 'bg-green text-white';
            break;
        case ButtonColors.Red:
            buttonColor = link ? 'text-red' : 'bg-red text-white';
            break;
        default:
            buttonColor = link ? 'text-black' : 'bg-transparent text-black';
            break;
    }

    return (
        <button 
            className={`flex items-center justify-center text-sm rounded-sm ${padding} ${fontWeight} ${fullWidth && !link ? 'w-full' : ''} ${buttonColor} `}
            {...props}
        >
            {label}
        </button>
    );
};

export default Button;