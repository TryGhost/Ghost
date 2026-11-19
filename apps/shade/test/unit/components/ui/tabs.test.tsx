import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  Tabs,
  TabsContent,
  TabsDropdownTrigger,
  TabsList,
  TabsTrigger,
  TabsTriggerCount,
} from '../../../../src/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../../../src/components/ui/dropdown-menu';
import { render } from '../../utils/test-utils';

describe('Tabs Component', () => {
  it('preserves void elements while reserving underline label width', () => {
    render(
      <Tabs defaultValue="first" variant="underline">
        <TabsList>
          <TabsTrigger value="first">
            <img alt="" src="/avatar.png" />
            First
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const tab = screen.getByRole('tab', { name: 'First' });
    expect(tab.querySelectorAll('img')).toHaveLength(1);
  });

  it('keeps sizing copies out of tab names and renders count badges once', () => {
    render(
      <Tabs defaultValue="first" variant="underline">
        <TabsList>
          <TabsTrigger value="first">
            <>
              <span>First</span>
            </>
            <TabsTriggerCount>12</TabsTriggerCount>
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: /^First\s*12$/ })).toBeTruthy();
    expect(screen.getAllByText('12')).toHaveLength(1);
  });

  it('reserves underline label width without a second text copy', () => {
    render(
      <Tabs defaultValue="first" variant="underline">
        <TabsList>
          <TabsTrigger value="first">First</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    // A text copy would be read twice when the tab names something from inside an
    // aria-hidden region, such as the page behind an open menu.
    const tab = screen.getByRole('tab', { name: 'First' });
    const copy = tab.querySelector('[aria-hidden="true"]');
    expect(copy?.getAttribute('data-label')).toBe('First');
    expect(copy?.textContent).toBe('');
    expect(tab.textContent).toBe('First');
  });

  it('preserves the slotted element when reserving underline label width', () => {
    render(
      <Tabs defaultValue="first" variant="underline">
        <TabsList>
          <TabsTrigger value="first" asChild>
            <a href="#first">First</a>
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const tab = screen.getByRole('tab', { name: 'First' });
    expect(tab.tagName).toBe('A');
    expect(tab.getAttribute('href')).toBe('#first');
  });

  it('gives tab counts a distinct semantic background', () => {
    render(
      <Tabs defaultValue="first" variant="underline">
        <TabsList>
          <TabsTrigger value="first">
            First<TabsTriggerCount>12</TabsTriggerCount>
          </TabsTrigger>
          <TabsTrigger value="second">Second</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const count = screen.getByText('12');

    expect(count.className).toMatch(/bg-secondary/);
    expect(count.className).toMatch(/text-xs/);
    expect(count.className).not.toMatch(/bg-surface-elevated/);
    expect(count.className).not.toMatch(/text-sm/);
  });

  it('commits a focused field before changing tabs and changes value once', () => {
    const handleBlur = vi.fn();
    const handleValueChange = vi.fn();

    const TestTabs = () => {
      const [value, setValue] = useState('first');

      return (
        <Tabs
          value={value}
          onValueChange={(nextValue) => {
            handleValueChange(nextValue);
            setValue(nextValue);
          }}
        >
          <TabsList>
            <TabsTrigger value="first">First</TabsTrigger>
            <TabsTrigger value="second">Second</TabsTrigger>
          </TabsList>
          <TabsContent value="first">
            <input aria-label="Field" onBlur={handleBlur} />
          </TabsContent>
          <TabsContent value="second">Second panel</TabsContent>
        </Tabs>
      );
    };

    render(<TestTabs />);
    const input = screen.getByRole('textbox', { name: 'Field' });
    const secondTab = screen.getByRole('tab', { name: 'Second' });
    act(() => input.focus());

    fireEvent.mouseDown(secondTab);
    act(() => secondTab.focus());

    expect(handleBlur.mock.calls.length, 'Blur handler should run before the panel unmounts').toBe(
      1,
    );
    expect(handleValueChange.mock.calls.length, 'Value change handler should run once').toBe(1);
    expect(secondTab.getAttribute('aria-selected')).toBe('true');
  });

  describe('TabsDropdownTrigger', () => {
    const DropdownTabs = ({
      activationMode,
      id,
      initialValue = 'visitors',
      keepFocusOnClose,
      label,
      onValueChange,
      orientation,
    }: {
      activationMode?: 'automatic' | 'manual';
      id?: string;
      initialValue?: string;
      keepFocusOnClose?: boolean;
      label?: string;
      onValueChange?: (value: string) => void;
      orientation?: 'horizontal' | 'vertical';
    }) => {
      const [value, setValue] = useState(initialValue);
      const change = (next: string) => {
        onValueChange?.(next);
        setValue(next);
      };
      return (
        <Tabs
          activationMode={activationMode}
          orientation={orientation}
          value={value}
          onValueChange={change}
        >
          <TabsList>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <DropdownMenu>
              <TabsDropdownTrigger aria-label={label} id={id} value="members">
                Members
                <svg aria-hidden="true" />
              </TabsDropdownTrigger>
              <DropdownMenuContent
                onCloseAutoFocus={keepFocusOnClose ? (event) => event.preventDefault() : undefined}
              >
                <DropdownMenuItem onSelect={() => change('members')}>Paid members</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => change('revenue')}>Revenue</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <DropdownMenu>
              <TabsDropdownTrigger value="sources" disabled>
                Sources
              </TabsDropdownTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Referrers</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
          <TabsContent value="visitors">Visitors panel</TabsContent>
          <TabsContent value="members">Members panel</TabsContent>
          <TabsContent value="revenue">Revenue panel</TabsContent>
        </Tabs>
      );
    };

    const arrow = async (from: HTMLElement, key: string) => {
      act(() => from.focus());
      fireEvent.keyDown(from, { key });
      // Radix moves focus between tabs on the next tick.
      await waitFor(() => expect(document.activeElement).not.toBe(from));
      return document.activeElement;
    };

    it('renders the tab as the only control, which opens its menu', () => {
      render(<DropdownTabs />);

      const tabList = screen.getByRole('tablist');
      expect(within(tabList).queryAllByRole('button', { hidden: true })).toHaveLength(0);
      expect(tabList.querySelectorAll('button')).toHaveLength(4);

      const tab = screen.getByRole('tab', { name: 'Members' });
      expect(tab.getAttribute('aria-haspopup')).toBe('menu');
      expect(tab.getAttribute('aria-expanded')).toBe('false');
    });

    it('keeps the tab state and panel link that the menu trigger would replace', () => {
      render(<DropdownTabs />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      expect(tab.getAttribute('data-state')).toBe('inactive');
      expect(tab.getAttribute('aria-selected')).toBe('false');

      act(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Visitors' }));
      });
      fireEvent.keyDown(tab, { key: 'Enter' });
      fireEvent.click(screen.getByRole('menuitem', { name: 'Paid members' }));

      expect(tab.getAttribute('data-state')).toBe('active');
      const panel = screen.getByRole('tabpanel');
      expect(panel.textContent).toBe('Members panel');
      expect(tab.getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    });

    it('opens the menu with Enter and names it after the tab', () => {
      render(<DropdownTabs />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      fireEvent.keyDown(tab, { key: 'Enter' });

      expect(tab.getAttribute('aria-expanded')).toBe('true');
      const menu = screen.getByRole('menu');
      const labelledBy = document.getElementById(menu.getAttribute('aria-labelledby') ?? '');
      expect(labelledBy?.contains(tab)).toBe(true);
      expect(screen.getByRole('menu', { name: 'Members' })).toBe(menu);
    });

    it('names the tab and its menu from aria-label', () => {
      render(<DropdownTabs label="Members metric" />);

      const tab = screen.getByRole('tab', { name: 'Members metric' });
      fireEvent.keyDown(tab, { key: ' ' });

      expect(screen.getByRole('menu', { name: 'Members metric' })).toBeTruthy();
    });

    // In browsers, the menu cancels the pointerdown that opens it, so no mousedown follows.
    const clickOpen = (tab: HTMLElement) => {
      // A cancelled pointerdown is what stops browsers firing the mousedown that selects a tab.
      expect(fireEvent.pointerDown(tab, { button: 0, ctrlKey: false })).toBe(false);
      expect(screen.getByRole('menu')).toBeTruthy();
    };

    it('opens the menu on click without selecting the tab', () => {
      const handleValueChange = vi.fn();
      render(<DropdownTabs onValueChange={handleValueChange} />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);

      expect(handleValueChange).not.toHaveBeenCalled();
      expect(tab.getAttribute('aria-selected')).toBe('false');
    });

    it('returns focus to the selected tab when a menu opened by a click is dismissed', async () => {
      const handleValueChange = vi.fn();
      render(<DropdownTabs onValueChange={handleValueChange} />);

      // Select a tab after the dropdown tab, so its Tab stop is the one to keep.
      const revenue = await arrow(screen.getByRole('tab', { name: 'Members' }), 'ArrowRight');
      expect(revenue).toBe(screen.getByRole('tab', { name: 'Revenue' }));
      handleValueChange.mockClear();

      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      await waitFor(() => expect(document.activeElement).toBe(revenue));

      expect(handleValueChange).not.toHaveBeenCalled();
      expect(tab.getAttribute('aria-selected')).toBe('false');
      expect(revenue?.getAttribute('aria-selected')).toBe('true');
      expect((revenue as HTMLElement).tabIndex).toBe(0);
      expect(tab.tabIndex).toBe(-1);
    });

    it('keeps focus on the tab when a menu item opened by a click selects it', async () => {
      render(<DropdownTabs />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);
      fireEvent.click(screen.getByRole('menuitem', { name: 'Paid members' }));
      await waitFor(() => expect(document.activeElement).toBe(tab));

      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(tab.tabIndex).toBe(0);
    });

    it('returns focus to the tab when a menu opened from it by keyboard is dismissed', async () => {
      render(<DropdownTabs />);

      const tab = await arrow(screen.getByRole('tab', { name: 'Visitors' }), 'ArrowRight');
      fireEvent.keyDown(tab as HTMLElement, { key: 'Enter' });
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      expect(document.activeElement).toBe(tab);
      expect(tab?.getAttribute('aria-selected')).toBe('true');
    });

    it('returns focus to the tab in a manual tab list, without selecting it', async () => {
      render(<DropdownTabs activationMode="manual" />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

      await waitFor(() => expect(document.activeElement).toBe(tab));
      expect(tab.getAttribute('aria-selected')).toBe('false');
    });

    it('moves focus to the tab that a menu item selects', async () => {
      render(<DropdownTabs />);

      const tab = await arrow(screen.getByRole('tab', { name: 'Visitors' }), 'ArrowRight');
      fireEvent.keyDown(tab as HTMLElement, { key: 'Enter' });
      fireEvent.click(screen.getByRole('menuitem', { name: 'Revenue' }));

      const revenue = screen.getByRole('tab', { name: 'Revenue' });
      await waitFor(() => expect(document.activeElement).toBe(revenue));
      expect(revenue.getAttribute('aria-selected')).toBe('true');
      expect(tab?.getAttribute('aria-selected')).toBe('false');
    });

    it('keeps focus on the tab, unselected, when nothing in the list is selected', async () => {
      render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <DropdownMenu>
              <TabsDropdownTrigger value="members">Members</TabsDropdownTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Paid members</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
        </Tabs>,
      );

      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

      await waitFor(() => expect(document.activeElement).toBe(tab));
      expect(tab.getAttribute('aria-selected')).toBe('false');
    });

    it('treats focus after a pointer press that opened no menu like any focus', () => {
      render(<DropdownTabs />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      fireEvent.pointerDown(tab, { button: 2 });
      expect(screen.queryByRole('menu')).toBeNull();
      act(() => tab.focus());

      expect(document.activeElement).toBe(tab);
      expect(tab.getAttribute('aria-selected')).toBe('true');
    });

    it('keeps the selection when the selected tab cannot take the returning focus', async () => {
      render(<DropdownTabs initialValue="sources" />);

      // Browsers don't focus a disabled tab; jsdom does, so refuse it here.
      const sources = screen.getByRole('tab', { name: 'Sources' });
      vi.spyOn(sources, 'focus').mockImplementation(() => {});
      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      await waitFor(() => expect(sources.focus).toHaveBeenCalled());
      expect(tab.getAttribute('aria-selected')).toBe('false');
      expect(sources.getAttribute('aria-selected')).toBe('true');
    });

    it('selects the tab on later focus when its menu closed without returning focus', async () => {
      render(<DropdownTabs keepFocusOnClose />);

      const visitors = screen.getByRole('tab', { name: 'Visitors' });
      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      expect(document.activeElement).not.toBe(tab);

      // Arrowing in from another tab.
      expect(await arrow(visitors, 'ArrowRight')).toBe(tab);
      expect(tab.getAttribute('aria-selected')).toBe('true');
    });

    it('selects the tab when something else focuses it after its menu closed elsewhere', async () => {
      render(
        <>
          <button type="button">Elsewhere</button>
          <DropdownTabs keepFocusOnClose />
        </>,
      );

      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      act(() => elsewhere.focus());
      act(() => tab.focus());

      expect(document.activeElement).toBe(tab);
      expect(tab.getAttribute('aria-selected')).toBe('true');
    });

    it('selects the tab when focused from nowhere after its menu closed without returning focus', async () => {
      render(<DropdownTabs keepFocusOnClose />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      clickOpen(tab);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      act(() => (document.activeElement as HTMLElement | null)?.blur());
      // Past the time the menu has to return focus.
      await act(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 1100);
          }),
      );

      act(() => tab.focus());
      expect(document.activeElement).toBe(tab);
      expect(tab.getAttribute('aria-selected')).toBe('true');
    });

    it('runs consumer focus and pointer handlers', () => {
      const handleFocus = vi.fn();
      const handlePointerDown = vi.fn();
      render(
        <Tabs defaultValue="members">
          <TabsList>
            <DropdownMenu>
              <TabsDropdownTrigger
                value="members"
                onFocus={handleFocus}
                onPointerDown={handlePointerDown}
              >
                Members
              </TabsDropdownTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Paid members</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
        </Tabs>,
      );

      const tab = screen.getByRole('tab', { name: 'Members' });
      act(() => tab.focus());
      fireEvent.pointerDown(tab, { button: 0, ctrlKey: false });

      expect(handleFocus).toHaveBeenCalledTimes(1);
      expect(handlePointerDown).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('menu')).toBeTruthy();
    });

    it('runs a consumer key handler first, which can keep the menu shut', () => {
      const handleKeyDown = vi.fn((event: { preventDefault: () => void }) =>
        event.preventDefault(),
      );
      render(
        <Tabs defaultValue="members">
          <TabsList>
            <DropdownMenu>
              <TabsDropdownTrigger value="members" onKeyDown={handleKeyDown}>
                Members
              </TabsDropdownTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Paid members</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
        </Tabs>,
      );

      fireEvent.keyDown(screen.getByRole('tab', { name: 'Members' }), { key: 'Enter' });

      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('is reached by arrow keys and selected like any other tab', async () => {
      const handleValueChange = vi.fn();
      render(<DropdownTabs onValueChange={handleValueChange} />);

      const members = screen.getByRole('tab', { name: 'Members' });
      expect(members.tabIndex).toBe(-1);

      expect(await arrow(screen.getByRole('tab', { name: 'Visitors' }), 'ArrowRight')).toBe(
        members,
      );
      expect(handleValueChange).toHaveBeenCalledWith('members');
      expect(members.getAttribute('aria-selected')).toBe('true');
    });

    it('moves on with ArrowDown in a vertical tab list instead of opening the menu', async () => {
      render(<DropdownTabs orientation="vertical" />);

      const members = screen.getByRole('tab', { name: 'Members' });
      expect(await arrow(members, 'ArrowDown')).toBe(screen.getByRole('tab', { name: 'Revenue' }));
      expect(screen.queryByRole('menu')).toBeNull();

      fireEvent.keyDown(members, { key: 'Enter' });
      expect(screen.getByRole('menu', { name: 'Members' })).toBeTruthy();
    });

    it('opens the menu without selecting the tab in a manual tab list', async () => {
      const handleValueChange = vi.fn();
      render(<DropdownTabs activationMode="manual" onValueChange={handleValueChange} />);

      const members = await arrow(screen.getByRole('tab', { name: 'Visitors' }), 'ArrowRight');
      expect(members).toBe(screen.getByRole('tab', { name: 'Members' }));
      fireEvent.keyDown(members as HTMLElement, { key: 'Enter' });

      expect(screen.getByRole('menu', { name: 'Members' })).toBeTruthy();
      expect(handleValueChange).not.toHaveBeenCalled();
    });

    it('skips a disabled dropdown tab and keeps its menu shut', async () => {
      render(<DropdownTabs />);

      const sources = screen.getByRole('tab', { name: 'Sources' });
      expect(sources.hasAttribute('disabled')).toBe(true);
      expect(await arrow(screen.getByRole('tab', { name: 'Revenue' }), 'ArrowRight')).toBe(
        screen.getByRole('tab', { name: 'Visitors' }),
      );

      fireEvent.pointerDown(sources, { button: 0, ctrlKey: false });
      fireEvent.keyDown(sources, { key: 'Enter' });
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('keeps the menu state when aria-expanded or aria-controls are passed anyway', () => {
      render(
        <Tabs defaultValue="visitors">
          <TabsList>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <DropdownMenu>
              <TabsDropdownTrigger aria-controls="elsewhere" aria-expanded={false} value="members">
                Members
              </TabsDropdownTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Paid members</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
          <TabsContent value="members">Members panel</TabsContent>
        </Tabs>,
      );

      const tab = screen.getByRole('tab', { name: 'Members' });
      fireEvent.keyDown(tab, { key: 'Enter' });

      expect(tab.getAttribute('aria-expanded')).toBe('true');
      expect(tab.getAttribute('aria-controls')).toMatch(/-content-members$/);
    });

    it('puts an id on the tab and still names the menu', () => {
      render(<DropdownTabs id="members-tab" />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      expect(tab.id).toBe('members-tab');
      fireEvent.keyDown(tab, { key: 'Enter' });

      expect(screen.getByRole('menu', { name: 'Members' })).toBeTruthy();
    });
  });
});
