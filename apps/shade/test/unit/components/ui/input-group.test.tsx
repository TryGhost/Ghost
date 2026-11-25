import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { InputGroup, InputGroupInput } from '../../../../src/components/ui/input-group';
import { render } from '../../utils/test-utils';

describe('InputGroup Components', () => {
  it('uses the shared control height for the group and its input', () => {
    render(
      <InputGroup data-testid="input-group">
        <InputGroupInput data-testid="input-group-input" />
      </InputGroup>,
    );

    const group = screen.getByTestId('input-group');
    const input = screen.getByTestId('input-group-input');

    expect(group.className).toMatch(/h-\(--control-height\)/);
    expect(group.className).not.toMatch(/h-9/);
    expect(input.className).toMatch(/h-\(--control-height\)/);
    expect(input.className).not.toMatch(/h-9/);
  });
});
