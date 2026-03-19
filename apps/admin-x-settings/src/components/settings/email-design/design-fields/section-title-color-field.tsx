import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const SectionTitleColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Section title color"
            value={settings.section_title_color || '#000000'}
            onChange={color => onSettingsChange({section_title_color: color})}
        />
    );
};
