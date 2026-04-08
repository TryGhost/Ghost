import {type ReactNode, useRef, useState} from 'react';
import ColorPicker from './color-picker';

import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';

export type SemanticColorPickerSwatch = {
    hex: string;
    value?: string | null;
    title: string;
};

export interface SemanticColorPickerFieldProps {
    title?: ReactNode;
    value?: string | null;
    onChange?: (newValue: string | null) => void;
    swatches?: SemanticColorPickerSwatch[];
    direction?: 'ltr' | 'rtl';
    accentColor?: string;
    alwaysOpen?: boolean;
    testId?: string;
}

const VALID_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const isTransparent = (hex: string) => {
    const normalized = hex.toLowerCase();

    return (normalized.length === 5 && normalized[4] === '0') || (normalized.length === 9 && normalized.slice(7) === '00');
};

const resolvePickerHex = (value: string | null | undefined, swatches: SemanticColorPickerSwatch[], accentColor?: string): string => {
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

const TransparentIndicator = () => {
    return (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" data-testid="transparent-indicator" aria-hidden>
            <span className="absolute top-1/2 left-[-30%] block h-px w-[160%] -translate-y-1/2 -rotate-45 bg-red" />
        </span>
    );
};

const SemanticColorPickerField = ({
    title,
    value,
    onChange,
    swatches = [],
    direction = 'ltr',
    accentColor,
    alwaysOpen = false,
    testId
}: SemanticColorPickerFieldProps) => {
    const [open, setOpen] = useState(false);
    const allowPickerChanges = useRef(false);
    const suppressPickerChanges = useRef(false);
    const pickerHex = resolvePickerHex(value, swatches, accentColor);
    const selectedSwatch = swatches.find((swatch) => {
        return swatch.value === value || (value && swatch.hex.toLowerCase() === value.toLowerCase());
    });

    const swatchControls = (
        <div className="flex gap-1">
            {(open || alwaysOpen) && (
                <div className="flex items-center gap-1">
                    {swatches.map((swatch) => {
                        const swatchValue = swatch.value !== undefined ? swatch.value : swatch.hex;
                        const isSelected = selectedSwatch?.title === swatch.title;

                        return (
                            <button
                                key={swatch.title}
                                aria-label={swatch.title}
                                className={cn(
                                    'relative flex h-5 w-5 shrink-0 cursor-pointer items-center overflow-hidden rounded-full border border-grey-300 dark:border-grey-800',
                                    isSelected && 'outline outline-2 outline-green'
                                )}
                                style={{backgroundColor: swatch.hex}}
                                title={swatch.title}
                                type="button"
                                onClick={() => {
                                    allowPickerChanges.current = false;
                                    suppressPickerChanges.current = true;
                                    onChange?.(swatchValue);
                                    if (!alwaysOpen) {
                                        setOpen(false);
                                    }
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
                <div className="absolute inset-[3px] overflow-hidden rounded-full border border-white dark:border-grey-950" style={{backgroundColor: pickerHex}}>
                </div>
            </button>
        </div>
    );

    let triggerContent = swatchControls;

    if (title) {
        triggerContent = (
            <div className={cn('flex w-full cursor-pointer items-start first:mt-0', direction === 'rtl' && 'flex-row-reverse')}>
                <div className="shrink-0">{swatchControls}</div>
                <div className={cn('mt-[1px] flex-1', direction === 'rtl' ? 'pr-2' : 'pl-2')}>
                    {title}
                </div>
            </div>
        );
    }

    return (
        <Popover
            open={alwaysOpen || open}
            onOpenChange={(nextOpen) => {
                if (alwaysOpen) {
                    return;
                }

                if (nextOpen) {
                    allowPickerChanges.current = false;
                    suppressPickerChanges.current = false;
                } else {
                    allowPickerChanges.current = false;
                    suppressPickerChanges.current = false;
                }

                setOpen(nextOpen);
            }}
        >
            <div data-testid={testId}>
                <PopoverTrigger asChild>
                    {triggerContent}
                </PopoverTrigger>
            </div>
            <PopoverContent align="end" className="w-auto p-4">
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
                        value={pickerHex}
                        onChange={(hex) => {
                            if (suppressPickerChanges.current || !allowPickerChanges.current) {
                                return;
                            }

                            onChange?.(hex);
                        }}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default SemanticColorPickerField;
