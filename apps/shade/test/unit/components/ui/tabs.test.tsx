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
      onValueChange,
      label,
    }: {
      onValueChange?: (value: string) => void;
      label?: string;
    }) => {
      const [value, setValue] = useState('visitors');
      const change = (next: string) => {
        onValueChange?.(next);
        setValue(next);
      };
      return (
        <Tabs value={value} onValueChange={change}>
          <TabsList>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <DropdownMenu>
              <TabsDropdownTrigger aria-label={label} value="members">
                Members
                <svg aria-hidden="true" />
              </TabsDropdownTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => change('members')}>Paid members</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
          <TabsContent value="visitors">Visitors panel</TabsContent>
          <TabsContent value="members">Members panel</TabsContent>
        </Tabs>
      );
    };

    it('renders the tab as the only control, which opens its menu', () => {
      render(<DropdownTabs />);

      const tabList = screen.getByRole('tablist');
      expect(within(tabList).queryAllByRole('button', { hidden: true })).toHaveLength(0);
      expect(tabList.querySelectorAll('button')).toHaveLength(2);

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

    it('opens the menu on click without selecting the tab, also once dismissed', async () => {
      const handleValueChange = vi.fn();
      render(<DropdownTabs onValueChange={handleValueChange} />);

      const tab = screen.getByRole('tab', { name: 'Members' });
      fireEvent.pointerDown(tab, { button: 0, ctrlKey: false });
      fireEvent.mouseDown(tab, { button: 0 });
      expect(screen.getByRole('menu')).toBeTruthy();

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      await waitFor(() => expect(document.activeElement).toBe(tab));

      expect(screen.queryByRole('menu')).toBeNull();
      expect(handleValueChange).not.toHaveBeenCalled();
      expect(tab.getAttribute('aria-selected')).toBe('false');
    });

    it('is reached by arrow keys and selected like any other tab', async () => {
      const handleValueChange = vi.fn();
      render(<DropdownTabs onValueChange={handleValueChange} />);

      const visitors = screen.getByRole('tab', { name: 'Visitors' });
      const members = screen.getByRole('tab', { name: 'Members' });
      expect(members.tabIndex).toBe(-1);

      act(() => visitors.focus());
      fireEvent.keyDown(visitors, { key: 'ArrowRight' });

      await waitFor(() => expect(document.activeElement).toBe(members));
      expect(handleValueChange).toHaveBeenCalledWith('members');
      expect(members.getAttribute('aria-selected')).toBe('true');
    });
  });
});
