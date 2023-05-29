import React, {Fragment, useCallback, useEffect, useRef} from 'react';
import clsx from 'clsx';
import {Button} from './Button';
import {ReactComponent as EyedropperIcon} from '../../assets/icons/kg-eyedropper.svg';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {INPUT_CLASSES} from './Input';
import {getAccentColor} from '../../utils/getAccentColor';

export function ColorPicker({value, eyedropper, hasTransparentOption, onChange, onBlur}) {
    // HexColorInput doesn't support adding a ref on the input itself
    const inputWrapperRef = useRef(null);

    const stopPropagation = useCallback((e) => {
        // Prevent clashing with dragging the settings panel around
        e.stopPropagation();
        e.preventDefault();

        // Prevent closing the color picker when clicking somewhere inside it
        inputWrapperRef.current?.querySelector('input')?.focus();
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

    const onBlurHandler = useCallback((e) => {
        setTimeout(() => {
            if (!isUsingColorPicker.current && !inputWrapperRef.current?.contains(document.activeElement)) {
                onBlur();
            }
        }, 100);
    }, [onBlur]);

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

    return (
        <div className="mt-2" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <HexColorPicker color={hexValue || '#ffffff'} onChange={onChange} onMouseDown={startUsingColorPicker} onTouchStart={startUsingColorPicker} />
            <div className="mt-3 flex gap-2">
                <div ref={inputWrapperRef} className={`relative flex w-full items-center ${INPUT_CLASSES}`}>
                    <span className='ml-1 mr-2 text-grey-700'>#</span>
                    <HexColorInput aria-label="Color value" className='w-full bg-transparent' color={hexValue} onBlur={onBlurHandler} onChange={onChange} />
                    {eyedropper && !!window.EyeDropper && (
                        <button
                            className="absolute inset-y-0 right-3 my-auto h-4 w-4 p-[1px]"
                            type="button"
                            onMouseDown={openColorPicker}
                            onTouchStart={openColorPicker}
                        >
                            <EyedropperIcon className="h-full w-full" />
                        </button>
                    )}
                </div>

                {hasTransparentOption && <Button color='grey' value='Clear' onClick={() => onChange('transparent')} />}
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
                `relative flex h-5 w-5 shrink-0 items-center rounded-full border border-grey-200`,
                isSelected && 'outline outline-2 outline-green'
            )}
            style={{backgroundColor}}
            title={title}
            type="button"
            onMouseDown={onSelectHandler}
            onTouchStart={onSelectHandler}
        >
            {transparent && <div className="absolute left-0 top-0 z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
        </button>
    );
}

export function ColorIndicator({value, swatches, onSwatchChange, onTogglePicker}) {
    let backgroundColor = value;
    let selectedSwatch = swatches.find(swatch => swatch.hex === value)?.title;
    if (value === 'accent') {
        backgroundColor = getAccentColor();
        selectedSwatch = swatches.find(swatch => swatch.accent)?.title;
    } else if (value === 'transparent') {
        backgroundColor = 'white';
        selectedSwatch = swatches.find(swatch => swatch.transparent)?.title;
    }

    return (
        <div className='flex gap-1'>
            <div className={`flex items-center gap-1`}>
                {swatches.map(({customContent, ...swatch}) => (
                    customContent ? <Fragment key={swatch.title}>{customContent}</Fragment> : <ColorSwatch key={swatch.title} isSelected={selectedSwatch === swatch.title} onSelect={onSwatchChange} {...swatch} />
                ))}
            </div>
            <button aria-label="Pick color" className="relative h-6 w-6 rounded-full border border-grey-200" type="button" onClick={onTogglePicker}>
                <div className='absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]' />
                {value && !selectedSwatch && (
                    <div className="absolute inset-[3px] overflow-hidden rounded-full border border-grey-200" style={{backgroundColor}}>
                        {value === 'transparent' && <div className="absolute top-[3px] left-[3px] z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
                    </div>
                )}
            </button>
        </div>
    );
}
