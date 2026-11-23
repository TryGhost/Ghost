import ColorPickerField from '@/settings/components/color-picker-field';
import IconToggleGroup from '@/settings/components/icon-toggle-group';
import React from 'react';
import { FieldTitle } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { type NewsletterCardDesign, hasCard } from './newsletter-card';

// Prototype: these fields only drive the preview. Nothing is saved.

const NewsletterCardFields: React.FC<{
  card: NewsletterCardDesign;
  onChange: (card: NewsletterCardDesign) => void;
}> = ({ card, onChange }) => (
  <>
    <ColorPickerField
      direction="rtl"
      eyedropper={true}
      swatches={[
        {
          value: 'transparent',
          title: 'Transparent',
          hex: '#00000000',
        },
        {
          value: '#ffffff',
          title: 'White',
          hex: '#ffffff',
        },
      ]}
      title="Content background"
      value={card.contentBackground}
      onChange={(color) => onChange({ ...card, contentBackground: color || 'transparent' })}
    />
    {hasCard(card) && (
      <Inline className="w-full" gap="sm" justify="between">
        <FieldTitle>Content corners</FieldTitle>
        <IconToggleGroup
          label="Content corners"
          options={[
            {
              value: 'square',
              label: 'Squared',
              icon: <LucideIcon.Square className="size-3.5!" />,
            },
            {
              value: 'rounded',
              label: 'Rounded',
              icon: <LucideIcon.Squircle className="size-3.5!" />,
            },
          ]}
          value={card.contentCorners}
          onValueChange={(contentCorners) => onChange({ ...card, contentCorners })}
        />
      </Inline>
    )}
  </>
);

export default NewsletterCardFields;
