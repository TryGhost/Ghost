import ColorPickerField from '@/settings/app/components/color-picker-field';
import {getAutoSwatchHex} from './color-swatch-helpers';
import {useEmailDesign} from '@/settings/app/components/settings/email-design/email-design-context';

export const ButtonColorField = () => {
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
            title="Button color"
            value={settings.button_color}
            onChange={color => onSettingsChange({button_color: color})}
        />
    );
};
