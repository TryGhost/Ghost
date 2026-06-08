// NOTE: this has been copy-pasted into apps/posts/src/views/Automations/components/email-design/design-fields/divider-color-field.tsx because we need to support the email design modal in both the settings app and the posts app until Automations GAs
import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const DividerColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();

    return (
        <ColorPickerField
            accentColor={accentColor}
            swatches={[
                {
                    title: 'Light',
                    value: null,
                    hex: '#e0e7eb'
                },
                {
                    title: 'Accent',
                    value: 'accent',
                    hex: accentColor
                }
            ]}
            title="Divider color"
            value={settings.divider_color}
            onChange={color => onSettingsChange({divider_color: color})}
        />
    );
};
