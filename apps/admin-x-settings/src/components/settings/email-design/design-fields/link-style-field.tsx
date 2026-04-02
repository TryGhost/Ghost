import {Bold, Type, Underline} from 'lucide-react';
import {ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {useEmailDesign} from '../email-design-context';

export const LinkStyleField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span>Link style</span>
            <ToggleGroup type="single" value={settings.link_style || 'underline'} onValueChange={(value: string) => value && onSettingsChange({link_style: value})}>
                <ToggleGroupItem aria-label="Underline" value="underline"><Underline className="size-4" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Regular" value="regular"><Type className="size-4" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Bold" value="bold"><Bold className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};
