import IconToggleGroup from '@/settings/components/icon-toggle-group';
import React from 'react';
import { FieldTitle } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import type { DividerStyle } from './newsletter-divider';

// Prototype: this control only drives the preview. Nothing is saved.

/** A 14px drawing of each divider style, in the button's text colour. */
const DividerIcon: React.FC<{ dividerStyle: DividerStyle }> = ({ dividerStyle }) => (
  <svg aria-hidden="true" className="size-3.5!" fill="currentColor" viewBox="0 0 14 14">
    {dividerStyle === 'thin' && <rect height={1.25} width={14} x={0} y={6.375} />}
    {dividerStyle === 'dots' &&
      [2.5, 7, 11.5].map((cx) => <circle key={cx} cx={cx} cy={7} r={1.25} />)}
    {dividerStyle === 'short' && <rect height={2.5} rx={1.25} width={8} x={3} y={5.75} />}
  </svg>
);

export const DividerStyleField: React.FC<{
  value: DividerStyle;
  onChange: (value: DividerStyle) => void;
}> = ({ value, onChange }) => (
  <Inline className="w-full" gap="sm" justify="between">
    <FieldTitle>Divider style</FieldTitle>
    <IconToggleGroup
      label="Divider style"
      options={[
        { value: 'thin', label: 'Thin line', icon: <DividerIcon dividerStyle="thin" /> },
        { value: 'dots', label: 'Three dots', icon: <DividerIcon dividerStyle="dots" /> },
        { value: 'short', label: 'Short thick line', icon: <DividerIcon dividerStyle="short" /> },
      ]}
      value={value}
      onValueChange={onChange}
    />
  </Inline>
);
