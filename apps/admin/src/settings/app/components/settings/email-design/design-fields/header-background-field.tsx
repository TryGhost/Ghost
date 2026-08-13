import ColorPickerField from '@/settings/app/components/color-picker-field';
import {useEmailDesign} from '@/settings/app/components/settings/email-design/email-design-context';

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
