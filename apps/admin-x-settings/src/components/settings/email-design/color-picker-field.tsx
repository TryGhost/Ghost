import React, {useState} from 'react';
import {
    ColorPicker,
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@tryghost/shade';

interface ColorPickerFieldProps {
    title: string;
    value: string;
    onChange: (color: string) => void;
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({title, value, onChange}) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">{title}</span>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        className="aspect-square size-7 rounded-full p-1"
                        style={{background: 'conic-gradient(from 0deg, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))'}}
                        title={title}
                        type="button"
                    >
                        <span
                            className="block size-full rounded-full border-2 border-white"
                            style={{background: value || '#ffffff'}}
                        />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-4">
                    <ColorPicker
                        value={value}
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
