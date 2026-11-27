import IconToggleGroup from '@/settings/components/icon-toggle-group';
import { FieldTitle } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useEmailDesign } from '@/settings/email-design/email-design-context';

export const ImageCornersField = () => {
  const { settings, onSettingsChange } = useEmailDesign();
  return (
    <Inline className="w-full" gap="sm" justify="between">
      <FieldTitle>Image corners</FieldTitle>
      <IconToggleGroup
        label="Image corners"
        options={[
          { value: 'square', label: 'Squared', icon: <LucideIcon.Square className="size-3.5!" /> },
          {
            value: 'rounded',
            label: 'Rounded',
            icon: <LucideIcon.Squircle className="size-3.5!" />,
          },
        ]}
        value={settings.image_corners || 'square'}
        onValueChange={(imageCorners) => onSettingsChange({ image_corners: imageCorners })}
      />
    </Inline>
  );
};
