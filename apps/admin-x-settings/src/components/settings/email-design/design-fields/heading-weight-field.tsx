import {FONT_WEIGHT_OPTIONS, getValidWeight} from './font-constants';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@tryghost/shade';
import {useEmailDesign} from '../email-design-context';

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
