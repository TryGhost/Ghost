import IconToggleGroup from '@/settings/components/icon-toggle-group';
import { FieldTitle } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useEmailDesign } from '@/settings/email-design/email-design-context';

export const LinkStyleField = () => {
  const { settings, onSettingsChange } = useEmailDesign();
  return (
    <Inline className="w-full" gap="sm" justify="between">
      <FieldTitle>Link style</FieldTitle>
      <IconToggleGroup
        label="Link style"
        options={[
          {
            value: 'underline',
            label: 'Underline',
            icon: <LucideIcon.Underline className="size-3.5!" />,
          },
          { value: 'regular', label: 'Regular', icon: <LucideIcon.Type className="size-3.5!" /> },
          { value: 'bold', label: 'Bold', icon: <LucideIcon.Bold className="size-3.5!" /> },
        ]}
        value={settings.link_style || 'underline'}
        onValueChange={(linkStyle) => onSettingsChange({ link_style: linkStyle })}
      />
    </Inline>
  );
};
