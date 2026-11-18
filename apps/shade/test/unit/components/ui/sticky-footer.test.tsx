import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StickyFooter } from '@/components/ui/sticky-footer';

// jsdom has no stylesheet, so these check the classes the painted parts carry.
// The rendered colours and heights are checked in a browser.
const actionRow = () => screen.getByText('Actions');
const paddingFill = () => actionRow().querySelector<HTMLElement>('[aria-hidden="true"]');

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
    expect(paddingFill()?.className).toContain('h-[var(--sticky-footer-inset,0px)]');
  });

  it('measures an overflow-hidden container, which sticky positioning uses', () => {
    render(
      <div style={{ overflowY: 'auto', paddingBottom: '24px' }}>
        <div style={{ overflowY: 'hidden', paddingBottom: '8px' }}>
          <StickyFooter data-testid="footer">Actions</StickyFooter>
        </div>
      </div>,
    );

    expect(screen.getByTestId('footer').style.getPropertyValue('--sticky-footer-inset')).toBe(
      '8px',
    );
  });

  it('paints the action row and padding fill with the surface background', () => {
    render(<StickyFooter data-testid="footer">Actions</StickyFooter>);

    expect(screen.getByTestId('footer').className).toContain(
      '[--sticky-footer-bg:var(--sticky-footer-background,var(--background))]',
    );
    expect(actionRow().className).toContain('bg-(--sticky-footer-bg)');
    expect(paddingFill()?.className).toContain('bg-(--sticky-footer-bg)');
  });
});
