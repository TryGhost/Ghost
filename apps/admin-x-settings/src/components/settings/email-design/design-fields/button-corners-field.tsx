// NOTE: this has been copy-pasted into apps/posts/src/views/Automations/components/email-design/design-fields/button-corners-field.tsx because we need to support the email design modal in both the settings app and the posts app until Automations GAs
import {ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {useEmailDesign} from '../email-design-context';

export const ButtonCornersField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span>Button corners</span>
            <ToggleGroup type="single" value={settings.button_corners || 'rounded'} onValueChange={(value: string) => value && onSettingsChange({button_corners: value})}>
                <ToggleGroupItem aria-label="Square" value="square"><span className="inline-block size-4 border-[1.5px] border-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Rounded" value="rounded"><span className="inline-block size-4 rounded-sm border-[1.5px] border-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Pill" value="pill"><span className="inline-block size-4 rounded-full border-[1.5px] border-current" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};
