import {AlignCenter, AlignLeft} from 'lucide-react';
import {ToggleGroup, ToggleGroupItem} from '@tryghost/shade';
import {useEmailDesign} from '../email-design-context';

export const TitleAlignmentField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Title alignment</span>
            <ToggleGroup type="single" value={settings.title_alignment || 'left'} onValueChange={(value: string) => value && onSettingsChange({title_alignment: value})}>
                <ToggleGroupItem aria-label="Align left" value="left"><AlignLeft className="size-4" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Align center" value="center"><AlignCenter className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};
