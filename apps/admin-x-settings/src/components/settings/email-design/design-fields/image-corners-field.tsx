import {ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {useEmailDesign} from '../email-design-context';

export const ImageCornersField = () => {
    const {settings, onSettingsChange} = useEmailDesign();
    return (
        <div className="flex items-center justify-between">
            <span>Image corners</span>
            <ToggleGroup type="single" value={settings.image_corners || 'square'} onValueChange={(value: string) => value && onSettingsChange({image_corners: value})}>
                <ToggleGroupItem aria-label="Square" value="square"><span className="inline-block size-4 border-[1.5px] border-current" /></ToggleGroupItem>
                <ToggleGroupItem aria-label="Rounded" value="rounded"><span className="inline-block size-4 rounded-sm border-[1.5px] border-current" /></ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
};
