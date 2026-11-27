import IconToggleGroup from '@/settings/components/icon-toggle-group';
import { FieldTitle } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useEmailDesign } from '@/settings/email-design/email-design-context';

export const ButtonCornersField = () => {
  const { settings, onSettingsChange } = useEmailDesign();
  return (
    <Inline className="w-full" gap="sm" justify="between">
      <FieldTitle>Button corners</FieldTitle>
      <IconToggleGroup
        label="Button corners"
        options={[
          { value: 'square', label: 'Squared', icon: <LucideIcon.Square className="size-3.5!" /> },
          {
            value: 'rounded',
            label: 'Rounded',
            icon: <LucideIcon.Squircle className="size-3.5!" />,
          },
          { value: 'pill', label: 'Pill', icon: <LucideIcon.Circle className="size-3.5!" /> },
        ]}
        value={settings.button_corners || 'rounded'}
        onValueChange={(buttonCorners) => onSettingsChange({ button_corners: buttonCorners })}
      />
    </Inline>
  );
};
