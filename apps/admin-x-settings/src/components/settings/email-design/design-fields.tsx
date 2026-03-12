import ColorPickerField from './color-picker-field';
import {AlignCenter, AlignLeft, Bold, Italic, Underline} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    ToggleGroup,
    ToggleGroupItem
} from '@tryghost/shade';
import {useEmailDesign} from './email-design-context';

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

// --- Global fields ---

export const BackgroundColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Background color"
            value={settings.background_color}
            onChange={color => onSettingsChange({background_color: color})}
        />
    );
};

export const HeadingFontField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    const handleChange = (value: string) => {
        const newWeight = getValidWeight(value, settings.title_font_weight);
        onSettingsChange({title_font_category: value, title_font_weight: newWeight});
    };
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Heading font</span>
            <Select value={settings.title_font_category || 'sans_serif'} onValueChange={handleChange}>
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
    );
};

export const HeadingWeightField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    const fontCategory = settings.title_font_category || 'sans_serif';
    const weightOptions = FONT_WEIGHT_OPTIONS[fontCategory]?.options || FONT_WEIGHT_OPTIONS.sans_serif.options;
    const currentWeight = getValidWeight(fontCategory, settings.title_font_weight);
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Heading weight</span>
            <Select value={currentWeight} onValueChange={(value: string) => onSettingsChange({title_font_weight: value})}>
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
    );
};

export const BodyFontField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Body font</span>
            <Select value={settings.body_font_category || 'sans_serif'} onValueChange={(value: string) => onSettingsChange({body_font_category: value})}>
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
    );
};

// --- Header fields ---

export const HeaderBackgroundField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Header background color"
            value={settings.header_background_color}
            onChange={color => onSettingsChange({header_background_color: color})}
        />
    );
};

export const PostTitleColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Post title color"
            value={settings.post_title_color || '#000000'}
            onChange={color => onSettingsChange({post_title_color: color})}
        />
    );
};

export const TitleAlignmentField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Title alignment</span>
            <ToggleGroup type="single" value={settings.title_alignment || 'left'} onValueChange={(value: string) => value && onSettingsChange({title_alignment: value})}>
                <ToggleGroupItem aria-label="Align left" value="left"><AlignLeft className="size-4" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Align center" value="center"><AlignCenter className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};

// --- Body fields ---

export const SectionTitleColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Section title color"
            value={settings.section_title_color || '#000000'}
            onChange={color => onSettingsChange({section_title_color: color})}
        />
    );
};

export const ButtonColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();
    return (
        <ColorPickerField
            title="Button color"
            value={settings.button_color || accentColor}
            onChange={color => onSettingsChange({button_color: color})}
        />
    );
};

export const ButtonStyleField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Button style</span>
            <ToggleGroup type="single" value={settings.button_style || 'fill'} onValueChange={(value: string) => value && onSettingsChange({button_style: value})}>
                <ToggleGroupItem aria-label="Fill" value="fill"><span className="inline-block h-4 w-5 rounded-sm bg-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Outline" value="outline"><span className="inline-block h-4 w-5 rounded-sm border-2 border-current" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};

export const ButtonCornersField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Button corners</span>
            <ToggleGroup type="single" value={settings.button_corners || 'rounded'} onValueChange={(value: string) => value && onSettingsChange({button_corners: value})}>
                <ToggleGroupItem aria-label="Square" value="square"><span className="inline-block size-4 border-2 border-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Rounded" value="rounded"><span className="inline-block size-4 rounded-sm border-2 border-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Pill" value="pill"><span className="inline-block size-4 rounded-full border-2 border-current" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};

export const LinkColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();
    return (
        <ColorPickerField
            title="Link color"
            value={settings.link_color || accentColor}
            onChange={color => onSettingsChange({link_color: color})}
        />
    );
};

export const LinkStyleField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Link style</span>
            <ToggleGroup type="single" value={settings.link_style || 'underline'} onValueChange={(value: string) => value && onSettingsChange({link_style: value})}>
                <ToggleGroupItem aria-label="Underline" value="underline"><Underline className="size-4" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Italic" value="regular"><Italic className="size-4" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Bold" value="bold"><Bold className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};

export const ImageCornersField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Image corners</span>
            <ToggleGroup type="single" value={settings.image_corners || 'square'} onValueChange={(value: string) => value && onSettingsChange({image_corners: value})}>
                <ToggleGroupItem aria-label="Square" value="square"><span className="inline-block size-4 border-2 border-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Rounded" value="rounded"><span className="inline-block size-4 rounded-sm border-2 border-current" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};

export const DividerColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Divider color"
            value={settings.divider_color || '#e0e7eb'}
            onChange={color => onSettingsChange({divider_color: color})}
        />
    );
};
