import { type ReactElement, useState } from 'react';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { PageMenu, PageMenuItem } from '../../../../src/components/ui/pagemenu';
import { render as baseRender } from '../../utils/test-utils';
import { ShadeContext } from '../../../../src/providers/shade-context';

const isActive = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('data-state') === 'active';

describe.each([false, true])('PageMenu with admin7Design=%s', (admin7Design) => {
  const render = (ui: ReactElement) =>
    baseRender(
      <ShadeContext.Provider
        value={{
          admin7Design,
          controlShape: 'pill',
          darkMode: false,
          isAnyTextFieldFocused: false,
          setFocusState: () => {},
        }}
      >
        {ui}
      </ShadeContext.Provider>,
    );
  it('highlights the item matching value', () => {
    render(
      <PageMenu value="second">
        <PageMenuItem value="first">First</PageMenuItem>
        <PageMenuItem value="second">Second</PageMenuItem>
      </PageMenu>,
    );

    expect(isActive('First')).toBe(false);
    expect(isActive('Second')).toBe(true);
    expect(screen.getByRole('button', { name: 'Second' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('keeps a controlled value until the parent changes it', () => {
    const handleValueChange = vi.fn();

    render(
      <PageMenu value="first" onValueChange={handleValueChange}>
        <PageMenuItem value="first">First</PageMenuItem>
        <PageMenuItem value="second">Second</PageMenuItem>
      </PageMenu>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    expect(handleValueChange.mock.calls).toStrictEqual([['second']]);
    expect(isActive('First')).toBe(true);
    expect(isActive('Second')).toBe(false);
  });

  it('follows the parent when controlled', () => {
    const TestMenu = () => {
      const [value, setValue] = useState('first');

      return (
        <PageMenu value={value} onValueChange={setValue}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
        </PageMenu>
      );
    };

    render(<TestMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    expect(isActive('First')).toBe(false);
    expect(isActive('Second')).toBe(true);
  });

  it('tracks its own selection from defaultValue when uncontrolled', () => {
    const handleValueChange = vi.fn();

    render(
      <PageMenu defaultValue="first" onValueChange={handleValueChange}>
        <PageMenuItem value="first">First</PageMenuItem>
        <PageMenuItem value="second">Second</PageMenuItem>
      </PageMenu>,
    );

    expect(isActive('First')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    expect(handleValueChange.mock.calls).toStrictEqual([['second']]);
    expect(isActive('First')).toBe(false);
    expect(isActive('Second')).toBe(true);
  });

  it('does not report a change when the active item is clicked again', () => {
    const handleValueChange = vi.fn();

    render(
      <PageMenu value="first" onValueChange={handleValueChange}>
        <PageMenuItem value="first">First</PageMenuItem>
      </PageMenu>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'First' }));

    expect(handleValueChange.mock.calls.length).toBe(0);
  });

  it('runs the item onClick and lets it cancel the selection', () => {
    const handleValueChange = vi.fn();
    const handleClick = vi.fn((event: React.MouseEvent) => event.preventDefault());

    render(
      <PageMenu defaultValue="first" onValueChange={handleValueChange}>
        <PageMenuItem value="first">First</PageMenuItem>
        <PageMenuItem value="second" onClick={handleClick}>
          Second
        </PageMenuItem>
      </PageMenu>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    expect(handleClick.mock.calls.length).toBe(1);
    expect(handleValueChange.mock.calls.length).toBe(0);
    expect(isActive('First')).toBe(true);
  });

  describe('when items overflow', () => {
    beforeAll(() => {
      global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    });

    it('uses the legacy fit threshold only with Admin 7 off', async () => {
      const style = document.createElement('style');
      style.textContent = '.gap-2 { column-gap: 8px; }';
      document.head.append(style);
      const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(122);
      const rect = vi
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          return new DOMRect(0, 0, this.hasAttribute('aria-haspopup') ? 80 : 50, 30);
        });
      onTestFinished(() => {
        style.remove();
        width.mockRestore();
        rect.mockRestore();
      });

      render(
        <PageMenu value="third" responsive>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
          <PageMenuItem value="third">Third</PageMenuItem>
        </PageMenu>,
      );

      await waitFor(() => expect(screen.getAllByRole('button')).toHaveLength(admin7Design ? 1 : 2));
      if (admin7Design) {
        expect(screen.queryByRole('button', { name: 'First' })).toBeNull();
      } else {
        expect(screen.getByRole('button', { name: 'First' })).toBeTruthy();
      }
    });

    // jsdom measures every element as 0px wide, so a responsive menu moves
    // all of its items into the overflow dropdown.
    const getOverflowTrigger = async () => {
      await waitFor(() =>
        expect(screen.queryAllByRole('button', { hidden: false }).length).toBe(1),
      );
      return screen.getByRole('button');
    };

    const openOverflow = async () => {
      fireEvent.keyDown(await getOverflowTrigger(), { key: 'Enter' });
      return screen.findAllByRole('menuitem');
    };

    it('shows the active hidden item on the trigger and in the dropdown', async () => {
      render(
        <PageMenu value="second" responsive>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
        </PageMenu>,
      );

      const trigger = await getOverflowTrigger();
      expect(trigger.textContent).toBe('Second');
      expect(trigger.getAttribute('data-state')).toBe(admin7Design ? 'active' : 'closed');

      await openOverflow();
      expect(screen.getByRole('menuitem', { name: 'Second' }).className).toMatch(/bg-accent/);
      expect(screen.getByRole('menuitem', { name: 'First' }).className).not.toMatch(/bg-accent/);
    });

    it('selects a hidden item when uncontrolled', async () => {
      const handleValueChange = vi.fn();

      render(
        <PageMenu defaultValue="first" responsive onValueChange={handleValueChange}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
        </PageMenu>,
      );

      await openOverflow();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Second' }));

      expect(handleValueChange.mock.calls).toStrictEqual([['second']]);
      expect((await getOverflowTrigger()).textContent).toBe('Second');
    });

    it('reports a hidden item but keeps a controlled value', async () => {
      const handleValueChange = vi.fn();

      render(
        <PageMenu value="first" responsive onValueChange={handleValueChange}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
        </PageMenu>,
      );

      await openOverflow();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Second' }));

      expect(handleValueChange.mock.calls).toStrictEqual([['second']]);
      expect((await getOverflowTrigger()).textContent).toBe('First');
    });

    it('passes the click event to a hidden item and lets it cancel the selection', async () => {
      const handleValueChange = vi.fn();
      const handleClick = vi.fn((event: React.MouseEvent) => event.preventDefault());

      render(
        <PageMenu defaultValue="first" responsive onValueChange={handleValueChange}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second" onClick={handleClick}>
            Second
          </PageMenuItem>
        </PageMenu>,
      );

      await openOverflow();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Second' }));

      expect(handleClick.mock.calls.length).toBe(1);
      expect(handleValueChange.mock.calls.length).toBe(0);
    });

    it('does not select a disabled hidden item', async () => {
      const handleValueChange = vi.fn();
      const handleClick = vi.fn();

      render(
        <PageMenu defaultValue="first" responsive onValueChange={handleValueChange}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second" disabled onClick={handleClick}>
            Second
          </PageMenuItem>
        </PageMenu>,
      );

      await openOverflow();
      const item = screen.getByRole('menuitem', { name: 'Second' });
      expect(item.getAttribute('aria-disabled')).toBe('true');

      fireEvent.click(item);

      expect(handleClick.mock.calls.length).toBe(0);
      expect(handleValueChange.mock.calls.length).toBe(0);
    });
  });
});
