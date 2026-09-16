import assert from 'assert/strict';
import { describe, it } from 'vitest';
import { screen } from '@testing-library/react';

import { FieldContent } from '../../../../src/components/ui/field';
import { render } from '../../utils/test-utils';

describe('Field Components', () => {
  it('uses the compact title and description rhythm', () => {
    render(<FieldContent data-testid="field-content" />);

    const content = screen.getByTestId('field-content');

    assert.match(content.className, /gap-0\.5/);
    assert.doesNotMatch(content.className, /gap-1(?:\s|$)/);
    assert.doesNotMatch(content.className, /gap-1\.5/);
  });
});
