import React from 'react';

export function ColorPicker({buttons = [], selectedColor, onClick}) {
    return (
        <div className="flex">
            <ul className="flex w-full items-center justify-between rounded font-sans text-md font-normal text-white">
                {buttons.map(({label, color}, index) => (
                    <ColorButton
                        key={index}
                        onClick={onClick}
                        label={label}
                        color={color}
                        selectedHex={selectedColor}
                    />
                ))}
            </ul>
        </div>
    );
}

export function ColorButton({onClick, label, color, selectedColor}) {
    const isActive = color === selectedColor;
    return (
        <li>
            <button
                type="button"
                className={`flex h-[3rem] w-[3rem] cursor-pointer items-center justify-center rounded-full border-2 ${isActive ? 'border-green' : 'border-white'}`}
                onClick={() => onClick(color)}
                aria-label={label}
            >
                <span
                    className={`bg-${color} h-6 w-6 rounded-full border-2 border-black/5`}
                ></span>
            </button>
        </li>
    );
}
