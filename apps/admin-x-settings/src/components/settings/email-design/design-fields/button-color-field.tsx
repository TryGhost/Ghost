import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const ButtonColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();
    return (
        <ColorPickerField
            title="Button color"
            value={settings.button_color || accentColor}
            onChange={color => onSettingsChange({button_color: color})}
        />
    );
};
