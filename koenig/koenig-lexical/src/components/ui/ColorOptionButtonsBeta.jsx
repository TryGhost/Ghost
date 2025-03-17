import PlusIcon from '../../assets/icons/plus.svg?react';
import React, {useState} from 'react';
import {Tooltip} from './Tooltip';
import {useClickOutside} from '../../hooks/useClickOutside';
import {usePreviousFocus} from '../../hooks/usePreviousFocus';

export function ColorOptionButtonsBeta({buttons = [], selectedName, onClick}) {
    const [isOpen, setIsOpen] = useState(false);
    const componentRef = React.useRef(null);

    const selectedButton = buttons.find(button => button.name === selectedName);

    // Close the swatch popover when clicking outside of it
    useClickOutside(isOpen, componentRef, () => setIsOpen(false));

    return (
        <div ref={componentRef} className="relative">
            <button
                className={`relative size-6 cursor-pointer rounded-full ${selectedName ? 'p-[2px]' : 'border border-grey-200 dark:border-grey-800'}`}
                data-testid="color-options-button"
                type="button"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedName && (
                    <div className="absolute inset-0 rounded-full bg-clip-content p-[3px]" style={{
                        background: 'conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'exclude'
                    }} />
                )}
                <span
                    className={`${selectedButton?.color || ''} block size-full rounded-full border-2 border-white dark:border-grey-950`}
                ></span>
            </button>

            {/* Color options popover */}
            {isOpen && (
                <div className="absolute -right-3 bottom-full z-10 mb-2 rounded-lg bg-white px-3 py-2 shadow dark:bg-grey-900" data-testid="color-options-popover">
                    <div className="flex">
                        <ul className="flex w-full items-center justify-between rounded-md font-sans text-md font-normal text-white">
                            {buttons.map(({label, name, color}) => (
                                name !== 'image' ?
                                    <ColorButton
                                        key={`${name}-${label}`}
                                        color={color}
                                        data-testid={`color-options-${name}-button`}
                                        label={label}
                                        name={name}
                                        selectedName={selectedName}
                                        onClick={(title) => {
                                            onClick(title);
                                            setIsOpen(false);
                                        }}
                                    />
                                    :
                                    <li key='background-image' className={`mb-0 flex size-[3rem] cursor-pointer items-center justify-center rounded-full border-2 ${selectedName === name ? 'border-green' : 'border-transparent'}`} data-testid="background-image-color-button" type="button" onClick={() => onClick(name)}>
                                        <span className="border-1 flex size-6 items-center justify-center rounded-full border border-black/5">
                                            <PlusIcon className="size-3 stroke-grey-700 stroke-2 dark:stroke-grey-500 dark:group-hover:stroke-grey-100" />
                                        </span>
                                    </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ColorButton({onClick, label, name, color, selectedName}) {
    const isActive = name === selectedName;

    const {handleMousedown, handleClick} = usePreviousFocus(onClick, name);
    return (
        <li className="mb-0">
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
