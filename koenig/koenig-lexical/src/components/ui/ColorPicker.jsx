import React, {useCallback, useEffect, useRef} from 'react';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {INPUT_CLASSES} from './Input';

export function ColorPicker({value, onChange, onBlur}) {
    // Prevent clashing with dragging the settings panel around
    const stopPropagation = useCallback(e => e.stopPropagation(), []);

    // HexColorInput doesn't support adding a ref on the input itself
    const inputWrapperRef = useRef(null);

    const isUsingColorPicker = useRef(false);

    const startUsingColorPicker = useCallback(() => isUsingColorPicker.current = true, []);
    const stopUsingColorPicker = useCallback(() => {
        isUsingColorPicker.current = false;
        inputWrapperRef.current?.querySelector('input')?.focus();
    }, []);

    const onBlurHandler = useCallback((e) => {
        setTimeout(() => {
            if (!isUsingColorPicker.current && !e.currentTarget.contains(document.activeElement)) {
                onBlur();
            }
        });
    }, [onBlur]);

    useEffect(() => {
        inputWrapperRef.current?.querySelector('input')?.focus();
    }, []);

    return (
        <div className="mt-2" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <HexColorPicker color={value || '#ffffff'} onChange={onChange} onMouseDown={startUsingColorPicker} onMouseUp={stopUsingColorPicker} onTouchEnd={stopUsingColorPicker} onTouchStart={startUsingColorPicker} />
            <div className="mt-3 flex">
                <div ref={inputWrapperRef} className={`flex w-full items-center ${INPUT_CLASSES} rounded-r-none`}>
                    <span className='ml-1 mr-2 text-grey-700'>#</span>
                    <HexColorInput aria-label="Colour value" className='w-full' color={value} onBlur={onBlurHandler} onChange={onChange} />
                </div>
                <div className={`flex items-center gap-1 ${INPUT_CLASSES} ml-[-1px] rounded-l-none`}>
                    <ColorSwatch color='accent' title='Brand color' />
                    <ColorSwatch color='black' title='Black' />
                    <ColorSwatch color='grey-100' title='Transparent' transparent={true} onClick={() => onChange('')} />
                </div>
            </div>
        </div>
    );
}

function ColorSwatch({color, title, transparent, onClick}) {
    return (
        <div className={`relative flex w-4 shrink-0 items-center rounded ${INPUT_CLASSES} bg-${color}`} title={title} onClick={onClick}>
            {transparent && <div className="absolute left-0 top-0 z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
        </div>
    );
}

export function ColorIndicator({value, onClick}) {
    return (
        <button aria-label="Pick colour" className="relative h-6 w-6" type="button" onClick={onClick}>
            <div className='absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]' />
            {value && <div className="absolute inset-[3px] rounded-full border border-white" style={{backgroundColor: value}} onClick={onClick} />}
        </button>
    );
}
