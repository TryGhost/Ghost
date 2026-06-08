// NOTE: this has been copy-pasted into apps/posts/src/views/Automations/components/email-design/design-fields/section-title-color-field.tsx because we need to support the email design modal in both the settings app and the posts app until Automations GAs
import ColorPickerField from '../color-picker-field';
import {getAutoSwatchHex} from './color-swatch-helpers';
import {useEmailDesign} from '../email-design-context';

export const SectionTitleColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();
    const autoSwatchHex = getAutoSwatchHex(settings.background_color);

    return (
        <ColorPickerField
            accentColor={accentColor}
            swatches={[
                {
                    title: 'Auto',
                    value: null,
                    hex: autoSwatchHex
                },
                {
                    title: 'Accent',
                    value: 'accent',
                    hex: accentColor
                }
            ]}
            title="Section title color"
            value={settings.section_title_color}
            onChange={color => onSettingsChange({section_title_color: color})}
        />
    );
};
