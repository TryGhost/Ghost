import React, {useCallback, useEffect, useRef} from 'react';
import {ReactComponent as EyedropperIcon} from '../../assets/icons/kg-eyedropper.svg';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {INPUT_CLASSES} from './Input';
import {getAccentColor} from '../../utils/getAccentColor';

export function ColorPicker({value, swatches, onChange, onBlur}) {
    // Prevent clashing with dragging the settings panel around
    const stopPropagation = useCallback(e => e.stopPropagation(), []);

    // HexColorInput doesn't support adding a ref on the input itself
    const inputWrapperRef = useRef(null);

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

    const pickSwatch = useCallback((color) => {
        onChange(color);

        inputWrapperRef.current?.querySelector('input')?.focus();
    }, [onChange]);

    const openColorPicker = useCallback((e) => {
        e.preventDefault();

        isUsingColorPicker.current = true;

        const eyeDropper = new window.EyeDropper();
        eyeDropper.open()
            .then(result => onChange(result.sRGBHex))
            .finally(() => {
                isUsingColorPicker.current = false;
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
            <div className="mt-3 flex">
                <div ref={inputWrapperRef} className={`flex w-full items-center ${INPUT_CLASSES} rounded-r-none`}>
                    <span className='ml-1 mr-2 text-grey-700'>#</span>
                    <HexColorInput aria-label="Color value" className='w-full' color={hexValue} onBlur={onBlurHandler} onChange={onChange} />
                </div>
                <div className={`flex items-center gap-1 ${INPUT_CLASSES} ml-[-1px] rounded-l-none`}>
                    {swatches.map(swatch => (
                        <ColorSwatch key={swatch.title} onSelect={pickSwatch} {...swatch} />
                    ))}

                    {!!window.EyeDropper && (
                        <button
                            className="ml-[2px] flex h-4 w-4 items-center justify-center p-[1px] pt-[2px]"
                            type="button"
                            onMouseDown={openColorPicker}
                            onTouchStart={openColorPicker}
                        >
                            <EyedropperIcon className="h-full w-full" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ColorSwatch({hex, accent, transparent, title, onSelect}) {
    const backgroundColor = accent ? getAccentColor() : hex;

    const ref = useRef(null);

    const onClickHandler = useCallback(() => {
        if (accent) {
            onSelect('accent');
        } else if (transparent) {
            onSelect('transparent');
        } else {
            onSelect(hex);
        }
    }, [accent, hex, onSelect, transparent]);

    return (
        <button ref={ref} className={`relative flex h-4 w-4 shrink-0 items-center rounded border border-grey-300`} style={{backgroundColor}} title={title} type="button" onClick={onClickHandler}>
            {transparent && <div className="absolute left-0 top-0 z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
        </button>
    );
}

export function ColorIndicator({value, onClick}) {
    let backgroundColor = value;
    if (value === 'accent') {
        backgroundColor = getAccentColor();
    } else if (value === 'transparent') {
        backgroundColor = 'white';
    }

    return (
        <button aria-label="Pick color" className="relative h-6 w-6" type="button" onClick={onClick}>
            <div className='absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]' />
            {value && (
                <div className="absolute inset-[3px] overflow-hidden rounded-full border border-grey-200" style={{backgroundColor}} onClick={onClick}>
                    {value === 'transparent' && <div className="absolute top-[3px] left-[3px] z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
                </div>
            )}
        </button>
    );
}
