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
                    title: 'Accent',
                    value: 'accent',
                    hex: accentColor
                },
                {
                    title: 'Auto',
                    value: null,
                    hex: autoSwatchHex
                }
            ]}
            title="Link color"
            value={settings.link_color}
            onChange={color => onSettingsChange({link_color: color})}
        />
    );
};
