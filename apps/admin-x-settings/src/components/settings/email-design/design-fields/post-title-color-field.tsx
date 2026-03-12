import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const PostTitleColorField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <ColorPickerField
            title="Post title color"
            value={settings.post_title_color || '#000000'}
            onChange={color => onSettingsChange({post_title_color: color})}
        />
    );
};
