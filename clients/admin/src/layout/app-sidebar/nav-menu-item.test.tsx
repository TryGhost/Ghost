// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavMenuItem } from './nav-menu-item';

const flags = vi.hoisted(() => ({ admin7Design: false }));

vi.mock('./use-is-active-link', () => ({
  useIsActiveLink: () => false,
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: () => flags.admin7Design,
}));

describe('NavMenuItem.Collapsible', () => {
  beforeEach(() => {
    flags.admin7Design = false;
  });

  it('wires the toggle button and collapsible menu through shared state', () => {
    const onExpandedChange = vi.fn();

    render(
      <NavMenuItem.Collapsible
        expanded={true}
        id="test-submenu"
        onExpandedChange={onExpandedChange}
      >
        <NavMenuItem.CollapsibleItem ariaLabel="Toggle test section">
          <span>Section</span>
        </NavMenuItem.CollapsibleItem>
        <NavMenuItem.CollapsibleMenu>
          <div>Nested item</div>
        </NavMenuItem.CollapsibleMenu>
      </NavMenuItem.Collapsible>,
    );

    const toggle = screen.getByRole('button', { name: 'Toggle test section' });
    expect(toggle.getAttribute('aria-controls')).toBe('test-submenu');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Nested item').closest('#test-submenu')).not.toBeNull();

    fireEvent.click(toggle);

    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it('unmounts nested items when collapsed', () => {
    render(
      <NavMenuItem.Collapsible expanded={false} id="test-submenu" onExpandedChange={vi.fn()}>
        <NavMenuItem.CollapsibleItem ariaLabel="Toggle test section">
          <span>Section</span>
        </NavMenuItem.CollapsibleItem>
        <NavMenuItem.CollapsibleMenu>
          <div>Nested item</div>
        </NavMenuItem.CollapsibleMenu>
      </NavMenuItem.Collapsible>,
    );

    expect(screen.queryByText('Nested item')).not.toBeInTheDocument();
  });

  it('opens immediately without stagger for reduced motion while keeping collapsed rows inaccessible', () => {
    flags.admin7Design = true;
    const media = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: () => true,
    }));
    function menu(expanded: boolean) {
      return (
        <NavMenuItem.Collapsible expanded={expanded} id="test-submenu" onExpandedChange={vi.fn()}>
          <NavMenuItem.CollapsibleMenu>
            <div data-sidebar="menu-item">
              <a href="#nested">Nested item</a>
            </div>
          </NavMenuItem.CollapsibleMenu>
        </NavMenuItem.Collapsible>
      );
    }
    try {
      const { rerender } = render(menu(false));
      const submenu = document.getElementById('test-submenu');
      expect(submenu).toHaveAttribute('aria-hidden', 'true');
      expect(submenu?.inert).toBe(true);
      expect(screen.queryByRole('link', { name: 'Nested item' })).not.toBeInTheDocument();

      // jsdom has no Web Animations API: reduced motion must not try to stagger rows.
      rerender(menu(true));
      expect(submenu?.inert).toBe(false);
      expect(screen.getByRole('link', { name: 'Nested item' })).toBeInTheDocument();
    } finally {
      media.mockRestore();
    }
  });
});
