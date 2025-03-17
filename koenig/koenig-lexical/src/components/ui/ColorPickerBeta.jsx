import EyedropperIcon from '../../assets/icons/kg-eyedropper.svg?react';
import ImgBgIcon from '../../assets/icons/kg-img-bg.svg?react';
import React, {Fragment, useCallback, useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import {Button} from './Button';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {Tooltip} from './Tooltip';
import {getAccentColor} from '../../utils/getAccentColor';
import {useClickOutside} from '../../hooks/useClickOutside';

export function ColorPickerBeta({value, eyedropper, hasTransparentOption, onChange, children}) {
    // HexColorInput doesn't support adding a ref on the input itself
    const inputWrapperRef = useRef(null);

    const stopPropagation = useCallback((e) => {
        e.stopPropagation();

        const inputElement = inputWrapperRef.current?.querySelector('input');
        const isInputField = e.target === inputElement;

        // Allow text selection for events on the input field
        if (isInputField) {
            return;
        }

        // Prevent closing the color picker when clicking somewhere inside it
        inputWrapperRef.current?.querySelector('input')?.focus();

        e.preventDefault();
    }, []);

    const isUsingColorPicker = useRef(false);

    const stopUsingColorPicker = useCallback(() => {
        isUsingColorPicker.current = false;
        inputWrapperRef.current?.querySelector('input')?.focus();

        document.removeEventListener('mouseup', stopUsingColorPicker);
        document.removeEventListener('touchend', stopUsingColorPicker);
    }, []);

    const startUsingColorPicker = useCallback(() => {
        isUsingColorPicker.current = true;

        document.addEventListener('mouseup', stopUsingColorPicker);
        document.addEventListener('touchend', stopUsingColorPicker);
    }, [stopUsingColorPicker]);

    const openColorPicker = useCallback((e) => {
        e.preventDefault();

        isUsingColorPicker.current = true;
        document.body.style.setProperty('pointer-events', 'none');

        const eyeDropper = new window.EyeDropper();
        eyeDropper.open()
            .then(result => onChange(result.sRGBHex))
            .finally(() => {
                isUsingColorPicker.current = false;
                document.body.style.removeProperty('pointer-events');
                inputWrapperRef.current?.querySelector('input')?.focus();
            });
    }, [onChange]);

    useEffect(() => {
        inputWrapperRef.current?.querySelector('input')?.focus();
    }, []);

    let hexValue = value;
    if (value === 'accent') {
        hexValue = getAccentColor();
    } else if (value === 'transparent') {
        hexValue = '';
    }

    const focusHexInputOnClick = useCallback((e) => {
        inputWrapperRef.current?.querySelector('input')?.focus();
    }, []);

    return (
        <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <HexColorPicker color={hexValue || '#ffffff'} onChange={onChange} onMouseDown={startUsingColorPicker} onTouchStart={startUsingColorPicker} />
            <div className="mt-3 flex gap-2">
                <div ref={inputWrapperRef} className={`relative flex w-full items-center rounded-lg border border-grey-100 bg-grey-100 px-3 py-1.5 font-sans text-sm font-normal text-grey-900 transition-colors placeholder:text-grey-500 focus-within:border-green focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(48,207,67,.25)] focus-within:outline-none dark:border-transparent dark:bg-grey-900 dark:text-white dark:selection:bg-grey-800 dark:placeholder:text-grey-700 dark:focus-within:border-green dark:hover:bg-grey-925 dark:focus:bg-grey-925`} onClick={focusHexInputOnClick}>
                    <span className='ml-1 mr-2 text-grey-700'>#</span>
                    <HexColorInput aria-label="Color value" className='z-50 w-full bg-transparent' color={hexValue} onChange={onChange} />
                    {eyedropper && !!window.EyeDropper && (
                        <button
                            className="absolute inset-y-0 right-3 z-50 my-auto size-4 p-[1px]"
                            type="button"
                            onClick={openColorPicker}
                        >
                            <EyedropperIcon className="size-full stroke-2" />
                        </button>
                    )}
                </div>

                {hasTransparentOption && <Button color='grey' value='Clear' onClick={() => onChange('transparent')} />}
                {children}
            </div>
        </div>
    );
}

function ColorSwatch({hex, accent, transparent, title, isSelected, onSelect}) {
    const backgroundColor = accent ? getAccentColor() : hex;

    const ref = useRef(null);

    const onSelectHandler = (e) => {
        e.preventDefault();

        if (accent) {
            onSelect('accent');
        } else if (transparent) {
            onSelect('transparent');
        } else {
            onSelect(hex);
        }
    };

    return (
        <button
            ref={ref}
            className={clsx(
                `group relative flex size-5 shrink-0 items-center rounded-full border border-grey-250 dark:border-grey-800`,
                isSelected && 'outline outline-2 outline-green'
            )}
            style={{backgroundColor}}
            title={title}
            type="button"
            onClick={onSelectHandler}
        >
            {transparent && <div className="absolute left-0 top-0 z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
            <Tooltip label={title} />
        </button>
    );
}

export function ColorIndicatorBeta({value, swatches, onSwatchChange, onTogglePicker, onChange, isExpanded, eyedropper, hasTransparentOption, children}) {
    const [isOpen, setIsOpen] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showChildren, setShowChildren] = useState(false);
    const popoverRef = useRef(null);

    useClickOutside(isOpen, popoverRef, () => setIsOpen(false));

    const stopPropagation = useCallback((e) => {
        e.stopPropagation();
        e.preventDefault();
    }, []);

    useEffect(() => {
        if (isExpanded) {
            setIsOpen(true);
            setShowChildren(true);
            setShowColorPicker(false);
        }
    }, [isExpanded]);

    let backgroundColor = value;
    let selectedSwatch = swatches.find(swatch => swatch.hex === value)?.title;

    if (value === 'accent') {
        backgroundColor = getAccentColor();
        selectedSwatch = swatches.find(swatch => swatch.accent)?.title;
    } else if (value === 'image') {
        backgroundColor = 'transparent';
        selectedSwatch = swatches.find(swatch => swatch.image)?.title;
    } else if (value === 'transparent') {
        backgroundColor = 'white';
        selectedSwatch = swatches.find(swatch => swatch.transparent)?.title;
    }

    if (isExpanded) {
        selectedSwatch = null;
    }

    const handleColorPickerChange = (newValue) => {
        onChange(newValue);
        // Don't close the popover when using the color picker
    };

    return (
        <div className="relative" data-testid="color-selector-button">
            <button
                className={`relative size-6 cursor-pointer rounded-full ${value ? 'p-[2px]' : 'border border-grey-200 dark:border-grey-800'}`}
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setShowColorPicker(false);
                    setShowChildren(false);
                }}
            >
                {value && (
                    <div className="absolute inset-0 rounded-full bg-clip-content p-[3px]" style={{
                        background: 'conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'exclude'
                    }} />
                )}
                <span
                    className="block size-full rounded-full border-2 border-white dark:border-grey-950"
                    style={{backgroundColor}}
                >
                    {
                        value === 'image' && (
                            <ImgBgIcon/>
                        )
                    }
                    {value === 'transparent' && <div className="absolute left-[3px] top-[3px] z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
                </span>
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className={clsx(
                        'absolute -right-3 bottom-full z-10 mb-2 flex flex-col gap-3 rounded-lg bg-white p-3 shadow transition-[width] duration-200 ease-in-out dark:bg-grey-900',
                        (showColorPicker || showChildren) && 'min-w-[296px]'
                    )}
                    onClick={stopPropagation}
                    onMouseDown={stopPropagation}
                    onTouchStart={stopPropagation}
                >
                    {showColorPicker && (
                        <ColorPickerBeta
                            eyedropper={eyedropper}
                            hasTransparentOption={hasTransparentOption}
                            value={value}
                            onChange={handleColorPickerChange}
                        />
                    )}
                    {showChildren && children}
                    <div className="flex justify-end gap-1">
                        <div className={`flex items-center gap-1`}>
                            {swatches.map(({customContent, ...swatch}) => (
                                customContent ?
                                    <Fragment key={swatch.title}>{customContent}</Fragment> :
                                    <ColorSwatch
                                        key={swatch.title}
                                        isSelected={selectedSwatch === swatch.title}
                                        onSelect={(val) => {
                                            onSwatchChange(val);
                                            setShowColorPicker(false);
                                        }}
                                        {...swatch}
                                    />
                            ))}
                        </div>
                        <button
                            aria-label="Pick color"
                            className={`group relative size-6 rounded-full ${!selectedSwatch ? 'p-[2px]' : 'border border-grey-200 dark:border-grey-800'}`}
                            data-testid="color-picker-toggle"
                            type="button"
                            onClick={() => {
                                setShowColorPicker(!showColorPicker);
                                setShowChildren(false);
                                onTogglePicker();
                            }}
                        >
                            {!selectedSwatch ? (
                                <>
                                    <div className="absolute inset-0 rounded-full bg-clip-content p-[3px]" style={{
                                        background: 'conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))',
                                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                        WebkitMaskComposite: 'xor',
                                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                        maskComposite: 'exclude'
                                    }} />
                                    <span
                                        className="block size-full rounded-full border-2 border-white dark:border-grey-950"
                                        style={{backgroundColor: value}}
                                    >
                                        {value === 'transparent' && <div className="absolute left-[3px] top-[3px] z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
                                    </span>
                                </>
                            ) : (
                                <div className='absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]' />
                            )}
                            <Tooltip label='Pick color' />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
