import React from 'react';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {INPUT_CLASSES} from './Input';
import {useCallback} from 'react';

export function ColorPicker({value, onChange}) {
    // Prevent clashing with dragging the settings panel around
    const stopPropagation = useCallback(e => e.stopPropagation(), []);

    return (
        <div className="mt-2" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <HexColorPicker color={value || '#ffffff'} onChange={onChange} />
            <div className="mt-3 flex">
                <div className={`flex w-full items-center ${INPUT_CLASSES} rounded-r-none`}>
                    <span className='ml-1 mr-2 text-grey-700'>#</span>
                    <HexColorInput aria-label="Colour value" className='w-full' color={value} onChange={onChange} />
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
