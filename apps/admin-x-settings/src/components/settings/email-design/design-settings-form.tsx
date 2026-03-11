import React, {useState} from 'react';
import {
    Button,
    ColorPicker,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    ToggleGroup,
    ToggleGroupItem,
    cn
} from '@tryghost/shade';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import type {EmailDesignSettings} from './types';

// --- Color Picker Field ---

interface ColorSwatch {
    value: string | null;
    title: string;
    hex: string;
}

interface ColorPickerFieldProps {
    title: string;
    value: string | null;
    swatches?: ColorSwatch[];
    onChange: (color: string | null) => void;
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({title, value, swatches = [], onChange}) => {
    const [open, setOpen] = useState(false);

    const isSwatchSelected = (swatch: ColorSwatch) => {
        return value === swatch.value;
    };

    const displayHex = (() => {
        const matchingSwatch = swatches.find(s => s.value === value);
        if (matchingSwatch) {
            return matchingSwatch.hex;
        }
        if (value && /^#([0-9a-f]{3}){1,2}$/i.test(value)) {
            return value;
        }
        return '#000000';
    })();

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">{title}</span>
            <div className="flex items-center gap-1">
                {swatches.map(swatch => (
                    <button
                        key={swatch.title}
                        className={cn(
                            'flex h-[22px] items-center rounded-full border px-2 text-xs transition-colors',
                            isSwatchSelected(swatch)
                                ? 'border-green bg-green/10 text-green'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700'
                        )}
                        title={swatch.title}
                        type="button"
                        onClick={() => onChange(swatch.value)}
                    >
                        {swatch.title}
                    </button>
                ))}
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button
                            className={cn(
                                'size-6 rounded-full border-2 transition-shadow',
                                !swatches.some(s => isSwatchSelected(s))
                                    ? 'border-green ring-1 ring-green/30'
                                    : 'border-gray-200 dark:border-gray-700'
                            )}
                            style={{backgroundColor: displayHex}}
                            title="Pick color"
                            type="button"
                        />
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto p-4">
                        <ColorPicker
                            value={displayHex}
                            onChange={(hex) => {
                                onChange(hex);
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};

// --- Font options and weight mapping ---

const FONT_OPTIONS = [
    {value: 'serif', label: 'Elegant serif'},
    {value: 'sans_serif', label: 'Clean sans-serif'}
];

const FONT_WEIGHT_OPTIONS: Record<string, {options: {value: string; label: string}[]; map?: Record<string, string>}> = {
    sans_serif: {
        options: [
            {value: 'normal', label: 'Regular'},
            {value: 'medium', label: 'Medium'},
            {value: 'semibold', label: 'Semi-bold'},
            {value: 'bold', label: 'Bold'}
        ]
    },
    serif: {
        options: [
            {value: 'normal', label: 'Regular'},
            {value: 'bold', label: 'Bold'}
        ],
        map: {
            medium: 'normal',
            semibold: 'bold'
        }
    }
};

function getValidWeight(fontCategory: string, currentWeight: string): string {
    const config = FONT_WEIGHT_OPTIONS[fontCategory] || FONT_WEIGHT_OPTIONS.sans_serif;
    if (config.options.find(o => o.value === currentWeight)) {
        return currentWeight;
    }
    return config.map?.[currentWeight] || 'bold';
}

// --- Main Form ---

interface DesignSettingsFormProps {
    settings: EmailDesignSettings;
    onSettingsChange: (updates: Partial<EmailDesignSettings>) => void;
    accentColor: string;
}

const DesignSettingsForm: React.FC<DesignSettingsFormProps> = ({settings, onSettingsChange, accentColor}) => {
    const backgroundColorIsDark = () => {
        if (settings.background_color === 'light' || settings.background_color === '#ffffff') {
            return false;
        }
        return textColorForBackgroundColor(settings.background_color).hex().toLowerCase() === '#ffffff';
    };

    const autoColorHex = backgroundColorIsDark() ? '#ffffff' : '#000000';
    const fontCategory = settings.title_font_category || 'sans_serif';
    const weightOptions = FONT_WEIGHT_OPTIONS[fontCategory]?.options || FONT_WEIGHT_OPTIONS.sans_serif.options;
    const currentWeight = getValidWeight(fontCategory, settings.title_font_weight);

    const handleFontCategoryChange = (value: string) => {
        const newWeight = getValidWeight(value, settings.title_font_weight);
        onSettingsChange({title_font_category: value, title_font_weight: newWeight});
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Global */}
            <section>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Global</h4>
                <div className="flex flex-col gap-4">
                    <ColorPickerField
                        swatches={[{value: '#ffffff', title: 'White', hex: '#ffffff'}]}
                        title="Background color"
                        value={settings.background_color}
                        onChange={color => onSettingsChange({background_color: color || '#ffffff'})}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Heading font</span>
                        <Select value={fontCategory} onValueChange={handleFontCategoryChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FONT_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Heading weight</span>
                        <Select value={currentWeight} onValueChange={value => onSettingsChange({title_font_weight: value})}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {weightOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Body font</span>
                        <Select value={settings.body_font_category || 'sans_serif'} onValueChange={value => onSettingsChange({body_font_category: value})}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FONT_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </section>

            <Separator />

            {/* Header */}
            <section>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Header</h4>
                <div className="flex flex-col gap-4">
                    <ColorPickerField
                        swatches={[{value: 'transparent', title: 'Transparent', hex: '#00000000'}]}
                        title="Header background"
                        value={settings.header_background_color}
                        onChange={color => onSettingsChange({header_background_color: color || 'transparent'})}
                    />
                    <ColorPickerField
                        swatches={[
                            {value: null, title: 'Auto', hex: autoColorHex},
                            {value: 'accent', title: 'Accent', hex: accentColor}
                        ]}
                        title="Post title color"
                        value={settings.post_title_color}
                        onChange={color => onSettingsChange({post_title_color: color})}
                    />
                </div>
            </section>

            <Separator />

            {/* Body */}
            <section>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Body</h4>
                <div className="flex flex-col gap-4">
                    <ColorPickerField
                        swatches={[
                            {value: null, title: 'Auto', hex: autoColorHex},
                            {value: 'accent', title: 'Accent', hex: accentColor}
                        ]}
                        title="Section title color"
                        value={settings.section_title_color}
                        onChange={color => onSettingsChange({section_title_color: color})}
                    />
                    <ColorPickerField
                        swatches={[
                            {value: 'accent', title: 'Accent', hex: accentColor},
                            {value: null, title: 'Auto', hex: autoColorHex}
                        ]}
                        title="Button color"
                        value={settings.button_color}
                        onChange={color => onSettingsChange({button_color: color})}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Button style</span>
                        <ToggleGroup size="sm" type="single" value={settings.button_style || 'fill'} onValueChange={value => value && onSettingsChange({button_style: value})}>
                            <ToggleGroupItem value="fill">Fill</ToggleGroupItem>
                            <ToggleGroupItem value="outline">Outline</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Button corners</span>
                        <ToggleGroup size="sm" type="single" value={settings.button_corners || 'rounded'} onValueChange={value => value && onSettingsChange({button_corners: value})}>
                            <ToggleGroupItem value="square">Square</ToggleGroupItem>
                            <ToggleGroupItem value="rounded">Rounded</ToggleGroupItem>
                            <ToggleGroupItem value="pill">Pill</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <ColorPickerField
                        swatches={[
                            {value: 'accent', title: 'Accent', hex: accentColor},
                            {value: null, title: 'Auto', hex: autoColorHex}
                        ]}
                        title="Link color"
                        value={settings.link_color}
                        onChange={color => onSettingsChange({link_color: color})}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Link style</span>
                        <ToggleGroup size="sm" type="single" value={settings.link_style || 'underline'} onValueChange={value => value && onSettingsChange({link_style: value})}>
                            <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
                            <ToggleGroupItem value="regular">Regular</ToggleGroupItem>
                            <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Image corners</span>
                        <ToggleGroup size="sm" type="single" value={settings.image_corners || 'square'} onValueChange={value => value && onSettingsChange({image_corners: value})}>
                            <ToggleGroupItem value="square">Square</ToggleGroupItem>
                            <ToggleGroupItem value="rounded">Rounded</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <ColorPickerField
                        swatches={[
                            {value: null, title: 'Light', hex: '#e0e7eb'},
                            {value: 'accent', title: 'Accent', hex: accentColor}
                        ]}
                        title="Divider color"
                        value={settings.divider_color}
                        onChange={color => onSettingsChange({divider_color: color})}
                    />
                </div>
            </section>
        </div>
    );
};

export default DesignSettingsForm;
