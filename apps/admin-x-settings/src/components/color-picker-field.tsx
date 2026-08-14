import {ColorPicker, ColorPickerTrigger, type ColorSwatchOption, ColorSwatchRow} from '@tryghost/shade/patterns';
import {FieldDescription, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import {debounce} from '../utils/debounce';

export type ColorPickerFieldSwatch = ColorSwatchOption;

export interface ColorPickerFieldProps {
    testId?: string;
    title?: ReactNode;
    direction?: 'ltr' | 'rtl';
    hint?: ReactNode;
    error?: boolean;
    value?: string | null;
    eyedropper?: boolean;
    clearButtonValue?: string | null;
    onChange?: (color: string | null) => void;
    accentColor?: string;
    swatches?: ColorPickerFieldSwatch[];
    alwaysOpen?: boolean;
    debounceMs?: number;
}

const VALID_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const normalizeColorValue = (value: string | null | undefined, accentColor?: string, swatches: ColorPickerFieldSwatch[] = []): string => {
    if (value && VALID_HEX.test(value)) {
        return value;
    }

    switch (value) {
    case 'accent':
        return accentColor && VALID_HEX.test(accentColor) ? accentColor : '#ffffff';
    case 'dark':
        return '#08090c';
    case 'light':
        return '#ffffff';
    case 'transparent':
        return '#00000000';
    default:
        return swatches.find(swatch => swatch.value === value)?.hex || '#ffffff';
    }
};

const to6DigitHex = (hex: string) => hex.length === 4 ? hex.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : hex;

const ColorPickerField = ({
    testId,
    title,
    direction = 'rtl',
    hint,
    error,
    value,
    onChange,
    accentColor,
    swatches = [],
    alwaysOpen = false,
    debounceMs
}: ColorPickerFieldProps) => {
    const [open, setOpen] = useState(alwaysOpen);
    const [localValue, setLocalValue] = useState(value);
    const allowPickerChanges = useRef(false);
    const suppressPickerChanges = useRef(false);
    const earlyEscapeHandler = useRef<((event: KeyboardEvent) => void) | null>(null);
    const triggerId = useId();
    const normalizedValue = normalizeColorValue(localValue, accentColor, swatches);

    useEffect(() => {
        setLocalValue(currentValue => to6DigitHex(currentValue || '') === value ? currentValue : value);
    }, [value]);

    const debouncedOnChange = useMemo(() => onChange && debounceMs ? debounce(onChange, debounceMs) : onChange, [debounceMs, onChange]);
    const handleChange = useCallback((newValue: string | null) => {
        setLocalValue(newValue);
        debouncedOnChange?.(newValue ? to6DigitHex(newValue) : null);
    }, [debouncedOnChange]);

    const detachEarlyEscapeListener = useCallback(() => {
        if (earlyEscapeHandler.current) {
            window.removeEventListener('keydown', earlyEscapeHandler.current, true);
            earlyEscapeHandler.current = null;
        }
    }, []);

    const resetInteractionState = () => {
        allowPickerChanges.current = false;
        suppressPickerChanges.current = false;
    };

    const closePopover = () => {
        detachEarlyEscapeListener();
        resetInteractionState();
        if (!alwaysOpen) {
            setOpen(false);
        }
    };

    const attachEarlyEscapeListener = () => {
        if (earlyEscapeHandler.current) {
            return;
        }

        const handleEarlyEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            closePopover();
        };

        earlyEscapeHandler.current = handleEarlyEscape;
        window.addEventListener('keydown', handleEarlyEscape, true);
    };

    useEffect(() => detachEarlyEscapeListener, [detachEarlyEscapeListener]);

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                if (alwaysOpen) {
                    return;
                }
                resetInteractionState();
                if (nextOpen) {
                    attachEarlyEscapeListener();
                } else {
                    detachEarlyEscapeListener();
                }
                setOpen(nextOpen);
            }}
        >
            <div
                className={`flex w-full items-start justify-between gap-2 ${direction === 'ltr' ? 'flex-row-reverse' : ''}`}
                data-testid={testId}
            >
                    {title && (
                        <label className="min-w-0 flex-1 cursor-pointer text-left" htmlFor={triggerId}>
                            {title}
                            {hint && <FieldDescription className={error ? 'text-destructive' : undefined}>{hint}</FieldDescription>}
                        </label>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                        {open && swatches.length > 0 && (
                            <ColorSwatchRow
                                swatches={swatches}
                                value={localValue}
                                onSelect={(swatchValue) => {
                                    allowPickerChanges.current = false;
                                    suppressPickerChanges.current = true;
                                    handleChange(swatchValue);
                                    closePopover();
                                }}
                            />
                        )}
                        <PopoverTrigger asChild>
                            <ColorPickerTrigger id={triggerId} value={normalizedValue} />
                        </PopoverTrigger>
                    </div>
            </div>
            <PopoverContent
                align={direction === 'rtl' ? 'end' : 'start'}
                className="w-auto p-4"
                onEscapeKeyDown={event => event.stopPropagation()}
            >
                <div
                    onInputCapture={() => allowPickerChanges.current = true}
                    onKeyDownCapture={() => allowPickerChanges.current = true}
                    onMouseDownCapture={() => allowPickerChanges.current = true}
                    onPointerDownCapture={() => allowPickerChanges.current = true}
                    onTouchStartCapture={() => allowPickerChanges.current = true}
                >
                    <ColorPicker
                        value={normalizedValue}
                        onChange={(hex) => {
                            if (!suppressPickerChanges.current && allowPickerChanges.current) {
                                handleChange(hex.toLowerCase());
                            }
                        }}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ColorPickerField;
