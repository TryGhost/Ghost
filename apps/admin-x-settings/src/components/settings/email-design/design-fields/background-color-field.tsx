import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const BackgroundColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Background color"
            value={settings.background_color}
            onChange={color => onSettingsChange({background_color: color})}
        />
    );
};
