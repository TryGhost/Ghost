import assert from 'assert/strict';
import { describe, it } from 'vitest';
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

    assert.match(group.className, /h-\(--control-height\)/);
    assert.doesNotMatch(group.className, /h-9/);
    assert.match(input.className, /h-\(--control-height\)/);
    assert.doesNotMatch(input.className, /h-9/);
  });
});
