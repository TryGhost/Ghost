import clsx from 'clsx';
import {Fragment, MouseEvent, useRef} from 'react';

type SwatchColor =
    | {hex: string; accent?: undefined; transparent?: undefined}
    | {accent: boolean; hex?: undefined; transparent?: undefined}
    | {transparent: boolean; hex?: undefined; accent?: undefined}

const ColorSwatch: React.FC<SwatchColor & {
    title: string;
    isSelected: boolean;
    onSelect: (value: string) => void;
    getAccentColor?: () => string;
}> = ({hex, accent, transparent, title, isSelected, onSelect, getAccentColor}) => {
    const backgroundColor = accent ? getAccentColor?.() : hex;

    const ref = useRef(null);

    const onSelectHandler = (e: MouseEvent) => {
        e.preventDefault();

        if (accent) {
            onSelect('accent');
        } else if (transparent) {
            onSelect('transparent');
        } else {
            onSelect(hex!);
        }
    };

    return (
        <button
            ref={ref}
            className={clsx(
                `relative flex h-5 w-5 shrink-0 cursor-pointer items-center rounded-full border border-grey-200 dark:border-grey-800`,
                isSelected && 'outline outline-2 outline-green'
            )}
            style={{backgroundColor}}
            title={title}
            type="button"
            onClick={onSelectHandler}
        >
            {transparent && <div className="absolute left-0 top-0 z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
        </button>
    );
};

export type SwatchOption = SwatchColor & {
    title: string;
    customContent?: JSX.Element;
}

/** Should usually be used via [ColorPickerField](?path=/docs/global-form-color-picker-field--docs) */
const ColorIndicator: React.FC<{
    value?: string;
    swatches: SwatchOption[];
    onSwatchChange: (newValue: string) => void;
    onTogglePicker: () => void;
    isExpanded: boolean;
    getAccentColor?: () => string;
}> = ({value, swatches, onSwatchChange, onTogglePicker, isExpanded, getAccentColor}) => {
    let backgroundColor = value;
    let selectedSwatch = swatches.find(swatch => swatch.hex && swatch.hex === value)?.title;
    if (value === 'accent') {
        backgroundColor = getAccentColor?.();
        selectedSwatch = swatches.find(swatch => swatch.accent)?.title;
    } else if (value === 'transparent') {
        backgroundColor = 'white';
        selectedSwatch = swatches.find(swatch => swatch.transparent)?.title;
    }

    if (isExpanded) {
        selectedSwatch = undefined;
    }

    return (
        <div className='flex gap-1'>
            <div className={`flex items-center gap-1`}>
                {swatches.map(({customContent, ...swatch}) => (
                    customContent ? <Fragment key={swatch.title}>{customContent}</Fragment> : <ColorSwatch key={swatch.title} isSelected={selectedSwatch === swatch.title} onSelect={onSwatchChange} {...swatch} getAccentColor={getAccentColor} />
                ))}
            </div>
            <button aria-label="Pick color" className="relative h-6 w-6 cursor-pointer rounded-full border border-grey-200 dark:border-grey-800" type="button" onClick={onTogglePicker}>
                <div className='absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]' />
                {value && !selectedSwatch && (
                    <div className="dark:border-grey-950 absolute inset-[3px] overflow-hidden rounded-full border border-white" style={{backgroundColor}}>
                        {value === 'transparent' && <div className="absolute left-[3px] top-[3px] z-10 w-[136%] origin-left rotate-45 border-b border-b-red" />}
                    </div>
                )}
            </button>
        </div>
    );
};

export default ColorIndicator;
