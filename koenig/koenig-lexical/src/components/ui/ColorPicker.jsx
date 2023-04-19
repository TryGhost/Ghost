import React from 'react';
import {ReactComponent as PlusIcon} from '../../assets/icons/plus.svg';

export function ColorPicker({buttons = [], selectedName, onClick}) {
    return (
        <div className="flex">
            <ul className="flex w-full items-center justify-between rounded font-sans text-md font-normal text-white">
                {buttons.map(({label, name, color}) => (
                    name !== 'image' ?
                        <ColorButton
                            key={`${name}-${label}`}
                            colorClass={color}
                            label={label}
                            name={name}
                            selectedName={selectedName}
                            onClick={onClick}
                        />
                        :
                        <li key='background-image' className={`flex h-[3rem] w-[3rem] cursor-pointer items-center justify-center rounded-full border-2 ${selectedName === name ? 'border-green' : 'border-transparent'}`} data-testid="background-image-color-button" type="button" onClick={() => onClick(name)}>
                            <span className="border-1 flex h-6 w-6 items-center justify-center rounded-full border border-black/5">
                                <PlusIcon className="h-3 w-3 stroke-grey-700 stroke-2 dark:stroke-grey-500 dark:group-hover:stroke-grey-100" />
                            </span>
                        </li>

                ))}
            </ul>
        </div>
    );
}

export function ColorButton({onClick, label, name, colorClass, selectedName}) {
    const isActive = name === selectedName;
    return (
        <li>
            <button
                aria-label={label}
                className={`flex h-[3rem] w-[3rem] cursor-pointer items-center justify-center rounded-full border-2 ${isActive ? 'border-green' : 'border-transparent'}`}
                data-test-id={`color-picker-${name}`}
                type="button"
                onClick={() => onClick(name)}
            >
                <span
                    className={`bg-${colorClass} h-6 w-6 rounded-full border-2 border-black/5`}
                ></span>
            </button>
        </li>
    );
}
