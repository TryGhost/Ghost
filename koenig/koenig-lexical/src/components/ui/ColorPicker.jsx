import {HexColorInput, HexColorPicker} from 'react-colorful';
import {INPUT_CLASSES} from './Input';
import {useCallback} from 'react';

export function ColorPicker({value, onChange}) {
    // Prevent clashing with dragging the settings panel around
    const stopPropagation = useCallback(e => e.stopPropagation(), []);

    return (
        <div className="mt-2" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <HexColorPicker color={value || '#ffffff'} onChange={onChange} />
            <div className="mt-3 flex gap-2">
                <div className={`flex flex-1 items-center ${INPUT_CLASSES}`}>
                    <span className='ml-1 mr-2 text-grey-700'>#</span>
                    <HexColorInput aria-label="Colour value" color={value} onChange={onChange} />
                </div>
                <button className="cursor-pointer rounded bg-grey-100 px-4 text-sm font-semibold text-grey-900 dark:bg-black dark:text-white" type="button" onClick={() => onChange('')}>Clear</button>
            </div>
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
