import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const LinkColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();
    return (
        <ColorPickerField
            title="Link color"
            value={settings.link_color || accentColor}
            onChange={color => onSettingsChange({link_color: color})}
        />
    );
};
