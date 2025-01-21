import PlusIcon from '../../assets/icons/plus.svg?react';
import React from 'react';
import {Tooltip} from './Tooltip';
import {usePreviousFocus} from '../../hooks/usePreviousFocus';

export function ColorOptionButtons({buttons = [], selectedName, onClick}) {
    return (
        <div className="flex">
            <ul className="flex w-full items-center justify-between rounded-md font-sans text-md font-normal text-white">
                {buttons.map(({label, name, color}) => (
                    name !== 'image' ?
                        <ColorButton
                            key={`${name}-${label}`}
                            color={color}
                            label={label}
                            name={name}
                            selectedName={selectedName}
                            onClick={onClick}
                        />
                        :
                        <li key='background-image' className={`flex size-[3rem] cursor-pointer items-center justify-center rounded-full border-2 ${selectedName === name ? 'border-green' : 'border-transparent'}`} data-testid="background-image-color-button" type="button" onClick={() => onClick(name)}>
                            <span className="border-1 flex size-6 items-center justify-center rounded-full border border-black/5">
                                <PlusIcon className="size-3 stroke-grey-700 stroke-2 dark:stroke-grey-500 dark:group-hover:stroke-grey-100" />
                            </span>
                        </li>

                ))}
            </ul>
        </div>
    );
}

export function ColorButton({onClick, label, name, color, selectedName}) {
    const isActive = name === selectedName;

    const {handleMousedown, handleClick} = usePreviousFocus(onClick, name);
    return (
        <li>
            <button
                aria-label={label}
                className={`group relative flex size-6 cursor-pointer items-center justify-center rounded-full border-2 ${isActive ? 'border-green' : 'border-transparent'}`}
                data-test-id={`color-picker-${name}`}
                type="button"
                onClick={handleClick}
                onMouseDown={handleMousedown}
            >
                <span
                    className={`${color} size-[1.8rem] rounded-full border`}
                ></span>
                <Tooltip label={label} />
            </button>
        </li>
    );
}
