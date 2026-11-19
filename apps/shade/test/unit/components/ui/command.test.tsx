import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../../src/components/ui/command';
import { render } from '../../utils/test-utils';

describe('Command Components', () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('uses matching control typography for search and results', () => {
    render(
      <Command>
        <CommandInput data-testid="command-input" />
        <CommandList>
          <CommandGroup>
            <CommandItem data-testid="command-item">Result</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    const input = screen.getByTestId('command-input');
    const item = screen.getByTestId('command-item');

    expect(input.className).toMatch(/text-\(length:--text-control\)/);
    expect(input.className).not.toMatch(/text-sm/);
    expect(item.className).toMatch(/text-\(length:--text-control\)/);
  });

  describe('CommandDialog', () => {
    // A page with a button that opens the palette, and a menu whose item can open it too.
    function Page({
      open,
      menuOpen = false,
      ...props
    }: { open: boolean; menuOpen?: boolean } & Omit<
      React.ComponentProps<typeof CommandDialog>,
      'open'
    >) {
      return (
        <>
          <button type="button">Open palette</button>
          <button id="menu-button" type="button">
            More actions
          </button>
          {menuOpen && (
            <div aria-labelledby="menu-button" role="menu">
              <div role="menuitem" tabIndex={-1}>
                Search
              </div>
            </div>
          )}
          <button type="button">Elsewhere</button>
          <CommandDialog open={open} {...props}>
            <CommandInput placeholder="Search" />
            <CommandList>
              <CommandItem>Result</CommandItem>
            </CommandList>
          </CommandDialog>
        </>
      );
    }

    it('is named for screen readers, and has no description to point at', () => {
      const { rerender } = render(<Page open />);

      const dialog = screen.getByRole('dialog', { name: 'Command palette' });
      expect(screen.getByText('Command palette').className).toContain('sr-only');
      expect(dialog.hasAttribute('aria-describedby')).toBe(false);

      rerender(<Page aria-describedby="palette-help" title="Search the site" open />);
      expect(
        screen.getByRole('dialog', { name: 'Search the site' }).getAttribute('aria-describedby'),
      ).toBe('palette-help');
    });

    it('passes content props to the dialog content', () => {
      render(<Page className="custom-palette" data-testid="palette" open />);

      const content = screen.getByTestId('palette');
      expect(content.getAttribute('role')).toBe('dialog');
      expect(content.className).toContain('custom-palette');
    });

    it('gives the focus back to the element that had it when it opened', async () => {
      const { rerender } = render(<Page open={false} />);
      const opener = screen.getByRole('button', { name: 'Open palette' });
      opener.focus();

      rerender(<Page open />);
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByPlaceholderText('Search')),
      );

      rerender(<Page open={false} />);
      await waitFor(() => expect(document.activeElement).toBe(opener));
    });

    it('gives the focus to the menu button when a menu item opened it', async () => {
      const { rerender } = render(<Page open={false} menuOpen />);
      screen.getByRole('menuitem').focus();

      // Choosing the item opens the palette, and its menu animates out and unmounts after.
      rerender(<Page menuOpen open />);
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByPlaceholderText('Search')),
      );
      rerender(<Page open />);

      rerender(<Page open={false} />);
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More actions' })),
      );
    });

    it('gives the focus back to a menu item that is still there', async () => {
      const { rerender } = render(<Page open={false} menuOpen />);
      const item = screen.getByRole('menuitem');
      item.focus();

      // A menu that stays open, opening the palette with a shortcut.
      rerender(<Page menuOpen open />);
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByPlaceholderText('Search')),
      );

      rerender(<Page open={false} menuOpen />);
      await waitFor(() => expect(document.activeElement).toBe(item));
    });

    it('closes on Escape and lets the app send the focus somewhere else', async () => {
      const onOpenChange = vi.fn();
      const onCloseAutoFocus = vi.fn((event: Event) => {
        event.preventDefault();
        screen.getByRole('button', { name: 'Elsewhere' }).focus();
      });
      const { rerender } = render(
        <Page open={false} onCloseAutoFocus={onCloseAutoFocus} onOpenChange={onOpenChange} />,
      );
      screen.getByRole('button', { name: 'Open palette' }).focus();

      rerender(<Page open onCloseAutoFocus={onCloseAutoFocus} onOpenChange={onOpenChange} />);
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByPlaceholderText('Search')),
      );
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);

      rerender(
        <Page open={false} onCloseAutoFocus={onCloseAutoFocus} onOpenChange={onOpenChange} />,
      );
      await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalled());
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elsewhere' }));
    });
  });
});
