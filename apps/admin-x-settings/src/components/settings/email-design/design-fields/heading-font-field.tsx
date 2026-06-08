// NOTE: this has been copy-pasted into apps/posts/src/views/Automations/components/email-design/design-fields/heading-font-field.tsx because we need to support the email design modal in both the settings app and the posts app until Automations GAs
import {FONT_OPTIONS, getValidWeight} from './font-constants';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {useEmailDesign} from '../email-design-context';

export const HeadingFontField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    const handleChange = (value: string) => {
        const newWeight = getValidWeight(value, settings.title_font_weight);
        onSettingsChange({title_font_category: value, title_font_weight: newWeight});
    };
    return (
        <div className="flex items-center justify-between">
            <span>Heading font</span>
            <Select value={settings.title_font_category || 'sans_serif'} onValueChange={handleChange}>
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
