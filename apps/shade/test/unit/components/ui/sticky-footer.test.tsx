import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StickyFooter } from '@/components/ui/sticky-footer';

describe('StickyFooter', () => {
  it('fills the bottom padding of its scroll container', () => {
    render(
      <div style={{ overflowY: 'auto', paddingBottom: '24px' }}>
        <StickyFooter data-testid="footer">Actions</StickyFooter>
      </div>,
    );

    expect(screen.getByTestId('footer').style.getPropertyValue('--sticky-footer-inset')).toBe(
      '24px',
    );
  });

  it('takes its background from the surface it sits on', () => {
    render(<StickyFooter data-testid="footer">Actions</StickyFooter>);

    expect(screen.getByTestId('footer').className).toContain(
      '[--sticky-footer-bg:var(--sticky-footer-background,var(--background))]',
    );
  });
});
