import {ToggleGroup, ToggleGroupItem} from '@tryghost/shade';
import {useEmailDesign} from '../email-design-context';

export const ButtonCornersField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Button corners</span>
            <ToggleGroup type="single" value={settings.button_corners || 'rounded'} onValueChange={(value: string) => value && onSettingsChange({button_corners: value})}>
                <ToggleGroupItem aria-label="Square" value="square"><span className="inline-block size-4 border-2 border-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Rounded" value="rounded"><span className="inline-block size-4 rounded-sm border-2 border-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Pill" value="pill"><span className="inline-block size-4 rounded-full border-2 border-current" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};
