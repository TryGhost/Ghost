import { Label, RadioGroup, RadioGroupItem } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import type { NavigationPlacement } from '@tryghost/admin-x-framework/helpers';
import { NAVIGATION_OPTIONS } from '@/editor/publish/publish-options';

export interface NavigationOptionsProps {
  placement: NavigationPlacement;
  onChange: (placement: NavigationPlacement) => void;
}

export function NavigationOptions({ placement, onChange }: NavigationOptionsProps) {
  return (
    <RadioGroup
      value={placement ?? 'none'}
      onValueChange={(value) =>
        onChange(value === 'primary' || value === 'secondary' ? value : null)
      }
    >
      {NAVIGATION_OPTIONS.map((option) => (
        <Inline key={option.value} gap="sm">
          <RadioGroupItem id={`navigation-placement-${option.value}`} value={option.value} />
          <Label htmlFor={`navigation-placement-${option.value}`}>{option.label}</Label>
        </Inline>
      ))}
    </RadioGroup>
  );
}
