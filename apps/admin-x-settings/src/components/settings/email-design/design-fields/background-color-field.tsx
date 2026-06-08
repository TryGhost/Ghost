// NOTE: this has been copy-pasted into apps/posts/src/views/Automations/components/email-design/design-fields/background-color-field.tsx because we need to support the email design modal in both the settings app and the posts app until Automations GAs
import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const BackgroundColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            swatches={[
                {
                    title: 'White',
                    value: 'light',
                    hex: '#ffffff'
                }
            ]}
            title="Background color"
            value={settings.background_color}
            onChange={color => color && onSettingsChange({background_color: color})}
        />
    );
};
