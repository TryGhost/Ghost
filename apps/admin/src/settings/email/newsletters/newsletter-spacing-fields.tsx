import IconToggleGroup from '@/settings/components/icon-toggle-group';
import React from 'react';
import {
  Field,
  FieldLabel,
  FieldTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import type { ContentWidth, LineSpacing } from './newsletter-spacing';

// Prototype: these controls only drive the preview. Nothing is saved.

const CONTENT_WIDTH_OPTIONS: { value: ContentWidth; label: string }[] = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'default', label: 'Default' },
  { value: 'wide', label: 'Wide' },
];

export const ContentWidthField: React.FC<{
  value: ContentWidth;
  onChange: (value: ContentWidth) => void;
}> = ({ value, onChange }) => (
  <Inline className="w-full" gap="sm" justify="between">
    <FieldTitle className="shrink-0">Content width</FieldTitle>
    <Field className="max-w-[200px]">
      <FieldLabel className="sr-only">Content width</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => {
          const option = CONTENT_WIDTH_OPTIONS.find((candidate) => candidate.value === next);
          if (option) {
            onChange(option.value);
          }
        }}
      >
        <SelectTrigger aria-label="Content width">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONTENT_WIDTH_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  </Inline>
);

/** Three lines whose spacing shows how dense the text will be. */
const LineDensityIcon: React.FC<{ gap: number }> = ({ gap }) => (
  <svg
    aria-hidden="true"
    className="size-3.5!"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth={1.25}
    viewBox="0 0 14 14"
  >
    {[-gap, 0, gap].map((offset) => (
      <line key={offset} x1={2} x2={12} y1={7 + offset} y2={7 + offset} />
    ))}
  </svg>
);

export const LineSpacingField: React.FC<{
  value: LineSpacing;
  onChange: (value: LineSpacing) => void;
}> = ({ value, onChange }) => (
  <Inline className="w-full" gap="sm" justify="between">
    <FieldTitle>Line spacing</FieldTitle>
    <IconToggleGroup
      label="Line spacing"
      options={[
        { value: 'tight', label: 'Tight', icon: <LineDensityIcon gap={2.5} /> },
        { value: 'default', label: 'Default', icon: <LineDensityIcon gap={3.75} /> },
        { value: 'loose', label: 'Loose', icon: <LineDensityIcon gap={5} /> },
      ]}
      value={value}
      onValueChange={onChange}
    />
  </Inline>
);
