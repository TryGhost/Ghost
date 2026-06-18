import {FONT_OPTIONS} from './font-constants';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {useEmailDesign} from '../email-design-context';

export const BodyFontField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span>Body font</span>
            <Select value={settings.body_font_category || 'sans_serif'} onValueChange={(value: string) => onSettingsChange({body_font_category: value})}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent
                    onEscapeKeyDown={(event) => {
                        event.stopPropagation();
                    }}
                >
                    {FONT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};
