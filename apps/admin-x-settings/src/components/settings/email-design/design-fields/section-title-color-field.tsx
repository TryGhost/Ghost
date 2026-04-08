import ColorPickerField from '../color-picker-field';
import {getAutoSwatchHex} from './color-swatch-helpers';
import {useEmailDesign} from '../email-design-context';

export const SectionTitleColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();
    const autoSwatchHex = getAutoSwatchHex(settings.background_color);

    return (
        <ColorPickerField
            accentColor={accentColor}
            swatches={[
                {
                    hex: autoSwatchHex,
                    title: 'Auto',
                    value: null
                },
                {
                    hex: accentColor,
                    title: 'Accent',
                    value: 'accent'
                }
            ]}
            title="Section title color"
            value={settings.section_title_color}
            onChange={color => onSettingsChange({section_title_color: color})}
        />
    );
};
