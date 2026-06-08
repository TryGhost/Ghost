// NOTE: this has been copy-pasted into apps/posts/src/views/Automations/components/email-design/design-fields/link-color-field.tsx because we need to support the email design modal in both the settings app and the posts app until Automations GAs
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
