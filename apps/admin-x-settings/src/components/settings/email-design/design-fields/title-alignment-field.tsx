import {AlignCenter, AlignLeft} from 'lucide-react';
import {ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {useEmailDesign} from '../email-design-context';

export const TitleAlignmentField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Title alignment</span>
            <ToggleGroup type="single" value={settings.title_alignment || 'center'} onValueChange={(value: string) => value && onSettingsChange({title_alignment: value})}>
                <ToggleGroupItem aria-label="Center" value="center"><AlignCenter className="size-4" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Left" value="left"><AlignLeft className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};
