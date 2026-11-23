import React from 'react';
import {
  Field,
  FieldDescription,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { type ThemeVariantPreset } from './theme-variants';

/**
 * The presets of an official theme, one per demo (Source: News, Magazine,
 * Newsletter): picking one sets the theme's settings below as that demo has
 * them, to adjust from there. The one the settings match is shown picked;
 * after any change, it reads Custom.
 */
const ThemeVariantPicker: React.FC<{
  variants: ThemeVariantPreset[];
  selected?: string;
  onChoose: (id: string) => void;
}> = ({ variants, selected, onChoose }) => (
  <Field>
    <FieldLabel htmlFor="design-theme-preset">Preset</FieldLabel>
    <Select value={selected || ''} onValueChange={onChoose}>
      <SelectTrigger data-testid="design-theme-preset" id="design-theme-preset">
        <SelectValue placeholder="Custom" />
      </SelectTrigger>
      <SelectContent>
        {variants.map((variant) => (
          <SelectItem key={variant.id} value={variant.id}>
            {variant.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <FieldDescription>Sets the settings below as on the theme&apos;s demo.</FieldDescription>
  </Field>
);

export default ThemeVariantPicker;
