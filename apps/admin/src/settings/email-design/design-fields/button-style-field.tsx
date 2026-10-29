import IconToggleGroup from '@/settings/components/icon-toggle-group';
import { FieldTitle } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useEmailDesign } from '@/settings/email-design/email-design-context';

export const ButtonStyleField = () => {
  const { settings, onSettingsChange } = useEmailDesign();
  return (
    <Inline className="w-full" gap="sm" justify="between">
      <FieldTitle>Button style</FieldTitle>
      <IconToggleGroup
        label="Button style"
        options={[
          {
            value: 'fill',
            label: 'Fill',
            icon: <LucideIcon.Squircle className="size-3.5!" fill="currentColor" />,
          },
          {
            value: 'outline',
            label: 'Outline',
            icon: <LucideIcon.Squircle className="size-3.5!" />,
          },
        ]}
        value={settings.button_style || 'fill'}
        onValueChange={(buttonStyle) => onSettingsChange({ button_style: buttonStyle })}
      />
    </Inline>
  );
};
