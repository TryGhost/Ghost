import ColorPickerField from '../color-picker-field';
import {useEmailDesign} from '../email-design-context';

export const DividerColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();

    return (
        <ColorPickerField
            accentColor={accentColor}
            swatches={[
                {
                    title: 'Light',
                    value: null,
                    hex: '#e0e7eb'
                },
                {
                    title: 'Accent',
                    value: 'accent',
                    hex: accentColor
                }
            ]}
            title="Divider color"
            value={settings.divider_color}
            onChange={color => onSettingsChange({divider_color: color})}
        />
    );
};
