import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { Checkbox } from '../../../../src/components/ui/checkbox';
import { render } from '../../utils/test-utils';

describe('Checkbox Component', () => {
  it('uses the strong semantic border while preserving state styling', () => {
    render(<Checkbox aria-label="Visibility" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Visibility' });

    expect(checkbox.className).toMatch(/border-border-strong/);
    expect(checkbox.className).not.toMatch(/border-control-border/);
    expect(checkbox.className).toMatch(/data-\[state=checked\]:border-primary/);
    expect(checkbox.className).toMatch(/focus-visible:border-focus-ring/);
    expect(checkbox.className).toMatch(/aria-\[invalid=true\]:border-destructive/);
    expect(checkbox.className).toMatch(/disabled:opacity-50/);
  });
});
