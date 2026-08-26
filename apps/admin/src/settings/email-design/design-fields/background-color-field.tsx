import ColorPickerField from '@/settings/components/color-picker-field';
import {useEmailDesign} from '@/settings/email-design/email-design-context';

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
