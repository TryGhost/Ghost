import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { FieldContent } from '../../../../src/components/ui/field';
import { render } from '../../utils/test-utils';

describe('Field Components', () => {
  it('uses the compact title and description rhythm', () => {
    render(<FieldContent data-testid="field-content" />);

    const content = screen.getByTestId('field-content');

    expect(content.className).toMatch(/gap-0\.5/);
    expect(content.className).not.toMatch(/gap-1(?:\s|$)/);
    expect(content.className).not.toMatch(/gap-1\.5/);
  });
});
