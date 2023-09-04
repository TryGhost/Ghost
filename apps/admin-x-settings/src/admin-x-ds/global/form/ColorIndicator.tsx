import clsx from 'clsx';
import {Fragment, MouseEvent, useRef} from 'react';

const ColorSwatch: React.FC<{
    hex: string;
    value?: string | null;
    title: string;
    isSelected: boolean;
    onSelect: (value: string | null) => void;
}> = ({hex, value, title, isSelected, onSelect}) => {
    const ref = useRef(null);

    const onSelectHandler = (e: MouseEvent) => {
        e.preventDefault();

        if (value !== undefined) {
            onSelect(value);
        } else {
            onSelect(hex!);
        }
    };

    const isTransparent = (hex.length === 4 && hex[3] === '0') || (hex.length === 8 && hex.slice(6) === '00');

    return (
        <button
            ref={ref}
            className={clsx(
                `relative flex h-5 w-5 shrink-0 cursor-pointer items-center rounded-full border border-grey-200 dark:border-grey-800`,
                isSelected && 'outline outline-2 outline-green'
            )}
            style={{backgroundColor: hex}}
            title={title}
            type="button"
            onClick={onSelectHandler}
        >
            {isTransparent && <div className="absolute left-0 top-0 z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
        </button>
    );
};

export type SwatchOption = {
    hex: string;
    value?: string | null;
    title: string;
    customContent?: JSX.Element;
}

/** Should usually be used via [ColorPickerField](?path=/docs/global-form-color-picker-field--docs) */
const ColorIndicator: React.FC<{
    value?: string | null;
    swatches: SwatchOption[];
    onSwatchChange: (newValue: string | null) => void;
    onTogglePicker: () => void;
    isExpanded: boolean;
}> = ({value, swatches, onSwatchChange, onTogglePicker, isExpanded}) => {
    let selectedSwatch = swatches.find(swatch => swatch.value === value || swatch.hex === value);

    if (isExpanded) {
        selectedSwatch = undefined;
    }

    return (
        <div className='flex gap-1'>
            <div className={`flex items-center gap-1`}>
                {swatches.map(({customContent, ...swatch}) => (
                    customContent ? <Fragment key={swatch.title}>{customContent}</Fragment> : <ColorSwatch key={swatch.title} isSelected={selectedSwatch?.title === swatch.title} onSelect={onSwatchChange} {...swatch} />
                ))}
            </div>
            <button aria-label="Pick color" className="relative h-6 w-6 cursor-pointer rounded-full border border-grey-200 dark:border-grey-800" type="button" onClick={onTogglePicker}>
                <div className='absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]' />
                {value && !selectedSwatch && (
                    <div className="dark:border-grey-950 absolute inset-[3px] overflow-hidden rounded-full border border-white" style={{backgroundColor: value}}>
                        {value === 'transparent' && <div className="absolute left-[3px] top-[3px] z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
                    </div>
                )}
            </button>
        </div>
    );
};

export default ColorIndicator;
