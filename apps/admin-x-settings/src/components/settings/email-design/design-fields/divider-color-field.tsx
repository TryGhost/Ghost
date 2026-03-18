import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const DividerColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Divider color"
            value={settings.divider_color || '#e0e7eb'}
            onChange={color => onSettingsChange({divider_color: color})}
        />
    );
};
