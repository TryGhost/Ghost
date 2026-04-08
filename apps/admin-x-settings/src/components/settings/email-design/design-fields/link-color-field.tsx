import ColorPickerField from '../color-picker-field';
import {getAutoSwatchHex} from './color-swatch-helpers';
import {useEmailDesign} from '../email-design-context';

export const LinkColorField = () => {
    const {settings, onSettingsChange, accentColor} = useEmailDesign();
    const autoSwatchHex = getAutoSwatchHex(settings.background_color);

    return (
        <ColorPickerField
            accentColor={accentColor}
            swatches={[
                {
                    hex: accentColor,
                    title: 'Accent',
                    value: 'accent'
                },
                {
                    hex: autoSwatchHex,
                    title: 'Auto',
                    value: null
                }
            ]}
            title="Link color"
            value={settings.link_color}
            onChange={color => onSettingsChange({link_color: color})}
        />
    );
};
