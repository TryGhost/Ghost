import React, { useId } from 'react';
import { FieldTitle, Slider } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LINE_SPACING_STOPS, MARGIN_STOPS, type NewsletterSpacing } from './newsletter-spacing';

// Prototype: these sliders only drive the preview. Nothing is saved.

const SpacingSlider: React.FC<{
  title: string;
  stopCount: number;
  value: number;
  onChange: (stop: number) => void;
}> = ({ title, stopCount, value, onChange }) => {
  const titleId = useId();

  return (
    // Exactly the standard control height, like the dropdown and colour rows around it.
    <Inline align="center" className="h-(--control-height) w-full" gap="sm" justify="between">
      <FieldTitle className="shrink-0" id={titleId}>
        {title}
      </FieldTitle>
      <Slider
        aria-labelledby={titleId}
        aria-valuetext={`${value + 1} of ${stopCount}`}
        className="max-w-[200px]"
        max={stopCount - 1}
        min={0}
        step={1}
        value={[value]}
        showSteps
        onValueChange={([stop]: number[]) => onChange(stop)}
      />
    </Inline>
  );
};

const NewsletterSpacingFields: React.FC<{
  spacing: NewsletterSpacing;
  onChange: (spacing: NewsletterSpacing) => void;
}> = ({ spacing, onChange }) => (
  <>
    <SpacingSlider
      stopCount={MARGIN_STOPS.length}
      title="Margins"
      value={spacing.marginStop}
      onChange={(marginStop) => onChange({ ...spacing, marginStop })}
    />
    <SpacingSlider
      stopCount={LINE_SPACING_STOPS.length}
      title="Line spacing"
      value={spacing.lineSpacingStop}
      onChange={(lineSpacingStop) => onChange({ ...spacing, lineSpacingStop })}
    />
  </>
);

export default NewsletterSpacingFields;
