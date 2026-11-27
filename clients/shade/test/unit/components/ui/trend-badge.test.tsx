import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { TrendBadge } from '../../../../src/components/ui/trend-badge';
import { render } from '../../utils/test-utils';

describe('TrendBadge Component', () => {
  it('reads a rise as success by default', () => {
    render(<TrendBadge data-testid="trend" direction="up" value="+5%" />);
    const badge = screen.getByTestId('trend');

    expect(badge.className).toContain('text-state-success');
    expect(badge.className).not.toContain('text-state-danger');
  });

  it('reads a rise as danger when inverted', () => {
    render(<TrendBadge data-testid="trend" direction="up" value="+5%" inverted />);
    const badge = screen.getByTestId('trend');

    expect(badge.className).toContain('text-state-danger');
    expect(badge.className).not.toContain('text-state-success');
  });

  it('reads a fall as success when inverted', () => {
    render(<TrendBadge data-testid="trend" direction="down" value="-5%" inverted />);
    const badge = screen.getByTestId('trend');

    expect(badge.className).toContain('text-state-success');
    expect(badge.className).not.toContain('text-state-danger');
  });

  it('shows only the arrow for an empty value, naming the change from the tooltip', () => {
    render(
      <TrendBadge
        data-testid="trend"
        direction="up"
        tooltip="+5% compared to the previous 7 days"
        value=""
      />,
    );
    const badge = screen.getByTestId('trend');

    expect(badge.querySelector('.font-medium')).toBeNull();
    expect(badge.textContent).toBe('+5% compared to the previous 7 days');
    expect(badge.querySelector('.sr-only')).not.toBeNull();
  });

  it('renders nothing when hidden', () => {
    render(<TrendBadge data-testid="trend" direction="hidden" value="+5%" />);

    expect(screen.queryByTestId('trend')).toBeNull();
  });
});
