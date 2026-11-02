import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Badge } from '../../../../src/components/ui/badge';
import { render } from '../../utils/test-utils';

describe('Badge Component', () => {
  it('renders correctly with default props', () => {
    render(<Badge>Default Badge</Badge>);
    const badge = screen.getByText('Default Badge');

    expect(badge, 'Badge should be rendered').toBeTruthy();
    expect(badge.className, 'Should have default variant class').toContain('bg-primary');
  });

  it('applies different variants correctly', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>);
    const badge = screen.getByText('Secondary Badge');

    expect(badge.className, 'Should have secondary variant class').toContain('bg-secondary');
  });

  it('applies destructive variant correctly', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>);
    const badge = screen.getByText('Destructive Badge');

    expect(badge.className, 'Should have destructive variant class').toContain('bg-destructive');
  });

  it('applies success variant correctly', () => {
    render(<Badge variant="success">Success Badge</Badge>);
    const badge = screen.getByText('Success Badge');

    expect(badge.className, 'Should have success variant class').toContain('bg-green');
  });

  it('applies warning variant correctly', () => {
    render(<Badge variant="warning">Warning Badge</Badge>);
    const badge = screen.getByText('Warning Badge');

    expect(badge.className, 'Should have warning variant class').toContain('bg-state-warning');
  });

  it('applies outline variant correctly', () => {
    render(<Badge variant="outline">Outline Badge</Badge>);
    const badge = screen.getByText('Outline Badge');

    expect(badge.className, 'Should have outline variant class').toContain('text-foreground');
  });

  it('applies custom className correctly', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>);
    const badge = screen.getByText('Custom Badge');

    expect(badge.className, 'Should have custom class').toContain('custom-class');
  });

  it('passes additional props to the div element', () => {
    render(<Badge data-testid="badge-test">Test Badge</Badge>);
    const badge = screen.getByTestId('badge-test');

    expect(badge.textContent, 'Should render the text content').toBe('Test Badge');
  });
});
