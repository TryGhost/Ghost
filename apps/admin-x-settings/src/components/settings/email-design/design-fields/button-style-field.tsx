import {ToggleGroup, ToggleGroupItem} from '@tryghost/shade';
import {useEmailDesign} from '../email-design-context';

export const ButtonStyleField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span>Button style</span>
            <ToggleGroup type="single" value={settings.button_style || 'fill'} onValueChange={(value: string) => value && onSettingsChange({button_style: value})}>
                <ToggleGroupItem aria-label="Fill" value="fill"><span className="inline-block h-4 w-5 rounded-sm bg-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Outline" value="outline"><span className="inline-block h-4 w-5 rounded-sm border-[1.5px] border-current" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};
