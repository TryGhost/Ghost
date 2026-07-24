import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { cn } from "@tryghost/shade/utils";

/**
 * Color picking for the site screens — the Shade port of the legacy
 * ColorPickerField/ColorIndicator pair. Keeps the interaction contract the
 * suites rely on: one toggle button per field while collapsed, a hex textbox
 * once expanded, swatch buttons named by their `title`, and a debounced
 * onChange.
 */

export interface SwatchOption {
    hex: string;
    /** Emitted on select; falls back to `hex` when omitted. */
    value?: string | null;
    title: string;
}

const to6DigitHex = (hex: string) => (hex.length === 4 ? hex.replace(/#(.)(.)(.)/, "#$1$1$2$2$3$3") : hex);

export function ColorSwatches({
    swatches,
    value,
    size = "md",
    onSelect,
}: {
    swatches: SwatchOption[];
    value?: string | null;
    size?: "md" | "lg";
    onSelect: (value: string | null) => void;
}) {
    const selected = swatches.find((swatch) => swatch.value === value || swatch.hex === value);
    return (
        <div className="flex items-center gap-1">
            {swatches.map((swatch) => (
                <button
                    key={swatch.title}
                    className={cn(
                        "relative flex shrink-0 cursor-pointer items-center rounded-full border border-border",
                        size === "lg" ? "size-6" : "size-5",
                        selected?.title === swatch.title && "outline-2 outline-green",
                    )}
                    style={{ backgroundColor: swatch.hex }}
                    title={swatch.title}
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        onSelect(swatch.value !== undefined ? swatch.value : swatch.hex);
                    }}
                />
            ))}
        </div>
    );
}

export interface ColorPickerFieldProps {
    testId?: string;
    title?: ReactNode;
    hint?: ReactNode;
    direction?: "ltr" | "rtl";
    value?: string | null;
    swatches?: SwatchOption[];
    debounceMs?: number;
    onChange?: (value: string | null) => void;
}

export function ColorPickerField({ testId, title, hint, direction, value, swatches = [], debounceMs, onChange }: ColorPickerFieldProps) {
    const [isExpanded, setExpanded] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setLocalValue((currentValue) => {
            // Keep a 3-digit hex the user typed when the saved value is its
            // 6-digit expansion.
            if (to6DigitHex(currentValue || "") === value) {
                return currentValue;
            }
            return value;
        });
    }, [value]);

    useEffect(() => () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    // Close on click outside; clicks inside the field stop propagation.
    useEffect(() => {
        if (!isExpanded) {
            return;
        }
        const closePicker = () => setExpanded(false);
        document.addEventListener("click", closePicker);
        return () => document.removeEventListener("click", closePicker);
    }, [isExpanded]);

    const emitChange = useMemo(() => {
        const emit = (newValue: string | null) => onChange?.(newValue ? to6DigitHex(newValue) : null);
        if (!debounceMs) {
            return emit;
        }
        return (newValue: string | null) => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => emit(newValue), debounceMs);
        };
    }, [debounceMs, onChange]);

    const handleChange = (newValue: string | null) => {
        setLocalValue(newValue);
        emitChange(newValue);
    };

    const selectedSwatch = swatches.find((swatch) => swatch.value === localValue);

    const indicator = (
        <div className="flex gap-1">
            {isExpanded && swatches.length > 0 && (
                <ColorSwatches swatches={swatches} value={localValue} onSelect={(newValue) => {
                    handleChange(newValue);
                    setExpanded(false);
                }} />
            )}
            <button aria-label="Pick color" className="relative size-6 cursor-pointer rounded-full border border-border" type="button" onClick={() => setExpanded(!isExpanded)}>
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))]" />
                {(selectedSwatch || localValue) && (
                    <div className="absolute inset-[3px] overflow-hidden rounded-full border border-background" style={{ backgroundColor: selectedSwatch?.hex || localValue || undefined }} />
                )}
            </button>
        </div>
    );

    return (
        <div className="flex-col" data-testid={testId} onClick={(event) => event.stopPropagation()}>
            <div className={cn("flex w-full cursor-pointer items-start", direction === "rtl" && "flex-row-reverse")}>
                <div className="shrink-0">{indicator}</div>
                {title && (
                    <div className={cn("flex-1", direction === "rtl" ? "pr-2" : "pl-2")} onClick={() => setExpanded(!isExpanded)}>
                        <div className="text-sm font-medium">{title}</div>
                        {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
                    </div>
                )}
            </div>
            {isExpanded && (
                <div className="mt-2">
                    <HexColorPicker className="w-full" color={localValue || "#ffffff"} onChange={handleChange} />
                    <div className="mt-3 flex gap-2">
                        <div className="relative flex h-10 w-full items-center">
                            <span className="absolute top-[9px] left-2 z-10 mr-2 ml-1 text-muted-foreground">#</span>
                            <HexColorInput
                                aria-label="Hex color"
                                className="z-[1] w-full rounded-md border border-transparent bg-muted p-2 pl-6 transition-all focus:border-green focus:bg-background focus:shadow-[0_0_0_1px_rgba(48,207,67,1)] focus:outline-hidden"
                                color={localValue || undefined}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
