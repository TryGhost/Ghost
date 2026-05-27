// NOTE: this has been copy-pasted into apps/posts/src/views/Automations/components/email-design/design-fields/header-background-field.tsx because we need to support the email design modal in both the settings app and the posts app until Automations GAs
import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const HeaderBackgroundField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            swatches={[
                {
                    title: 'Transparent',
                    value: 'transparent',
                    hex: '#00000000'
                }
            ]}
            title="Header background color"
            value={settings.header_background_color}
            onChange={color => color && onSettingsChange({header_background_color: color})}
        />
    );
};
