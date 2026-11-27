import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { RadioGroup, RadioGroupItem } from '../../../../src/components/ui/radio-group';
import { render } from '../../utils/test-utils';

describe('RadioGroup Components', () => {
  it('uses the strong semantic border while preserving state styling', () => {
    render(
      <RadioGroup aria-label="Visibility">
        <RadioGroupItem aria-label="Public" value="public" />
      </RadioGroup>,
    );

    const radio = screen.getByRole('radio', { name: 'Public' });

    expect(radio.className).toMatch(/border-border-strong/);
    expect(radio.className).not.toMatch(/border-control-border/);
    expect(radio.className).toMatch(/data-\[state=checked\]:border-primary/);
    expect(radio.className).toMatch(/focus-visible:border-focus-ring/);
    expect(radio.className).toMatch(/aria-\[invalid=true\]:border-destructive/);
    expect(radio.className).toMatch(/disabled:opacity-50/);
  });
});
