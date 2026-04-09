import React, {useRef, useState} from 'react';
import {ColorPicker} from '@tryghost/shade/patterns';
import {Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';

export interface ColorPickerFieldSwatch {
    title: string;
    value: string | null;
    hex: string;
}

interface ColorPickerFieldProps {
    title: string;
    value: string | null;
    onChange: (color: string | null) => void;
    accentColor?: string;
    swatches?: ColorPickerFieldSwatch[];
}

const VALID_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const normalizeColorValue = (value: string | null, accentColor?: string, swatches: ColorPickerFieldSwatch[] = []): string => {
    if (value && VALID_HEX.test(value)) {
        return value;
    }

    switch (value) {
    case 'accent':
        return accentColor && VALID_HEX.test(accentColor) ? accentColor : '#ffffff';
    case 'light':
        return '#ffffff';
    case 'transparent':
        return '#00000000';
    default:
        break;
    }

    const selectedSwatch = swatches.find(swatch => swatch.value === value);
    if (selectedSwatch) {
        return selectedSwatch.hex;
    }

    return '#ffffff';
};

const isTransparent = (hex: string) => {
    const normalized = hex.toLowerCase();

    return (normalized.length === 5 && normalized[4] === '0') || (normalized.length === 9 && normalized.slice(7) === '00');
};

const TransparentIndicator = () => (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" data-testid="transparent-indicator" aria-hidden>
        <span className="absolute top-1/2 left-[-30%] block h-px w-[160%] -translate-y-1/2 -rotate-45 bg-red" />
    </span>
);

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({title, value, onChange, accentColor, swatches = []}) => {
    const [open, setOpen] = useState(false);
    const normalizedValue = normalizeColorValue(value, accentColor, swatches);
    const allowPickerChanges = useRef(false);
    const suppressPickerChanges = useRef(false);
    const selectedSwatch = swatches.find((swatch) => {
        return swatch.value === value || (value && swatch.hex.toLowerCase() === value.toLowerCase());
    });

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                allowPickerChanges.current = false;
                suppressPickerChanges.current = false;
                setOpen(nextOpen);
            }}
        >
            <PopoverTrigger asChild>
                <div className="flex w-full cursor-pointer items-start justify-between">
                    <span className="mt-px flex-1">{title}</span>
                    <div className="flex shrink-0 gap-1">
                        {open && swatches.length > 0 && (
                            <div className="flex items-center gap-1">
                                {swatches.map((swatch) => {
                                    const swatchValue = swatch.value === undefined ? swatch.hex : swatch.value;
                                    const isSelected = selectedSwatch?.title === swatch.title;

                                    return (
                                        <button
                                            key={swatch.title}
                                            aria-label={swatch.title}
                                            className={`relative flex h-5 w-5 shrink-0 cursor-pointer items-center overflow-hidden rounded-full border border-grey-300 dark:border-grey-800 ${isSelected ? 'outline-2 outline-green' : ''}`}
                                            style={{backgroundColor: swatch.hex}}
                                            title={swatch.title}
                                            type="button"
                                            onClick={() => {
                                                allowPickerChanges.current = false;
                                                suppressPickerChanges.current = true;
                                                onChange(swatchValue);
                                                setOpen(false);
                                            }}
                                        >
                                            {isTransparent(swatch.hex) && <TransparentIndicator />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <button
                            aria-label="Pick color"
                            className="relative size-6 cursor-pointer rounded-full border border-grey-250 dark:border-grey-800"
                            type="button"
                        >
                            <div className="absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]" />
                            <div className="absolute inset-[3px] overflow-hidden rounded-full border border-white dark:border-grey-950" style={{backgroundColor: normalizedValue}} />
                        </button>
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-auto p-4"
                onEscapeKeyDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <div
                    onInputCapture={() => {
                        allowPickerChanges.current = true;
                    }}
                    onKeyDownCapture={() => {
                        allowPickerChanges.current = true;
                    }}
                    onMouseDownCapture={() => {
                        allowPickerChanges.current = true;
                    }}
                    onPointerDownCapture={() => {
                        allowPickerChanges.current = true;
                    }}
                    onTouchStartCapture={() => {
                        allowPickerChanges.current = true;
                    }}
                >
                    <ColorPicker
                        value={normalizedValue}
                        onChange={(hex: string) => {
                            if (suppressPickerChanges.current || !allowPickerChanges.current) {
                                return;
                            }

                            onChange(hex);
                        }}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ColorPickerField;
