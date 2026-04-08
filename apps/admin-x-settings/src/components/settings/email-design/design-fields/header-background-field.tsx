import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const HeaderBackgroundField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            swatches={[
                {
                    hex: '#00000000',
                    title: 'Transparent',
                    value: 'transparent'
                }
            ]}
            title="Header background color"
            value={settings.header_background_color}
            onChange={color => color && onSettingsChange({header_background_color: color})}
        />
    );
};
