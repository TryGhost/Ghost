import React, {useState} from 'react';
import {ColorPicker} from '@tryghost/shade/patterns';
import {Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';

interface ColorPickerFieldProps {
    title: string;
    value: string;
    onChange: (color: string) => void;
    accentColor?: string;
}

const VALID_HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;

const normalizeColorValue = (value: string, accentColor?: string): string => {
    if (VALID_HEX.test(value)) {
        return value;
    }

    switch (value) {
    case 'accent':
        return accentColor && VALID_HEX.test(accentColor) ? accentColor : '#ffffff';
    case 'light':
    case 'transparent':
        return '#ffffff';
    default:
        return '#ffffff';
    }
};

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({title, value, onChange, accentColor}) => {
    const [open, setOpen] = useState(false);
    const normalizedValue = normalizeColorValue(value, accentColor);

    return (
        <div className="flex items-center justify-between">
            <span>{title}</span>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        aria-label={title}
                        className="aspect-square size-7 rounded-full p-1"
                        style={{background: 'conic-gradient(from 0deg, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))'}}
                        title={title}
                        type="button"
                    >
                        <span
                            className="block size-full rounded-full border-2 border-white"
                            style={{background: normalizedValue}}
                        />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-4">
                    <ColorPicker
                        value={normalizedValue}
                        onChange={(hex: string) => {
                            onChange(hex);
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default ColorPickerField;
