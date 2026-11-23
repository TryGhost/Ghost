import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

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

    it('is named for screen readers', () => {
      render(<Page open />);

      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeTruthy();
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

    it('leaves the focus where the app sends it as it closes', async () => {
      // The app moves the focus as the palette closes, say to the screen an item went to.
      const onCloseAutoFocus = vi.fn(() => {
        screen.getByRole('button', { name: 'Elsewhere' }).focus();
      });
      const { rerender } = render(<Page open={false} onCloseAutoFocus={onCloseAutoFocus} />);
      screen.getByRole('button', { name: 'Open palette' }).focus();

      rerender(<Page open onCloseAutoFocus={onCloseAutoFocus} />);
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByPlaceholderText('Search')),
      );

      rerender(<Page open={false} onCloseAutoFocus={onCloseAutoFocus} />);
      await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalled());
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elsewhere' }));
    });
  });
});
