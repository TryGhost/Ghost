import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const HeaderBackgroundField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Header background color"
            value={settings.header_background_color}
            onChange={color => onSettingsChange({header_background_color: color})}
        />
    );
};
