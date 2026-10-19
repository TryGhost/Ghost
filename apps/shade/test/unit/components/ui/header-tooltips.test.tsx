import { Children, type PropsWithChildren } from 'react';
import ShadeProvider from '../../../../src/providers/shade-provider';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PageHeader } from '../../../../src/components/patterns/page-header';
import { NavbarActions } from '../../../../src/components/ui/navbar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../../../../src/components/ui/tooltip';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('PointerEvent', MouseEvent);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

it('does not reopen a header tooltip when the browser restores focus', () => {
  render(
    <PageHeader.ActionGroup>
      <PageHeader.Action label="Search" iconOnly>
        Search icon
      </PageHeader.Action>
    </PageHeader.ActionGroup>,
  );
  const trigger = screen.getByRole('button', { name: 'Search' });
  fireEvent.keyDown(document, { key: 'Tab' });
  fireEvent.focus(trigger);
  expect(screen.queryByRole('tooltip')).not.toBeNull();
  fireEvent.blur(window);
  expect(screen.queryByRole('tooltip')).toBeNull();
  fireEvent.blur(trigger);
  fireEvent.focus(window);
  fireEvent.focus(trigger);
  expect(screen.queryByRole('tooltip')).toBeNull();
  // A deliberate keyboard interaction should still allow a tooltip.
  fireEvent.blur(trigger);
  fireEvent.keyDown(document, { key: 'Tab' });
  fireEvent.focus(trigger);
  expect(screen.queryByRole('tooltip')).not.toBeNull();
});

function SeparateGroups({ children }: PropsWithChildren) {
  return (
    <PageHeader.Actions>
      {Children.map(children, (child) => (
        <PageHeader.ActionGroup>{child}</PageHeader.ActionGroup>
      ))}
    </PageHeader.Actions>
  );
}

it('does not show a pending hover tooltip after switching away from the browser', () => {
  render(
    <PageHeader.ActionGroup>
      <PageHeader.Action label="Search" iconOnly>
        Search icon
      </PageHeader.Action>
    </PageHeader.ActionGroup>,
  );
  const trigger = screen.getByRole('button', { name: 'Search' });
  fireEvent.pointerMove(trigger);
  advance(500);
  fireEvent.blur(window);
  fireEvent.focus(window);
  advance(500);
  expect(screen.queryByRole('tooltip')).toBeNull();
  fireEvent.pointerLeave(trigger);
  fireEvent.pointerMove(trigger);
  advance(1000);
  expect(screen.getByRole('tooltip').textContent).toBe('Search');
});

it.each([
  { name: 'PageHeader', Actions: PageHeader.ActionGroup },
  { name: 'Navbar', Actions: NavbarActions },
  { name: 'separate header groups', Actions: SeparateGroups },
])('shares delayed-first and immediate-next hover behavior in $name', ({ Actions }) => {
  render(
    <TooltipProvider delayDuration={0}>
      <Actions>
        <PageHeader.Action label="Search" iconOnly>
          Search icon
        </PageHeader.Action>
        <PageHeader.Action label="More" iconOnly>
          More icon
        </PageHeader.Action>
      </Actions>
    </TooltipProvider>,
  );
  const search = screen.getByRole('button', { name: 'Search' });
  const more = screen.getByRole('button', { name: 'More' });
  fireEvent.pointerMove(search);
  advance(999);
  expect(screen.queryByRole('tooltip')).toBeNull();
  advance(1);
  expect(screen.getByRole('tooltip').textContent).toBe('Search');
  fireEvent.pointerLeave(search);
  fireEvent.pointerMove(document.body, { clientX: 1000, clientY: 1000 });
  fireEvent.pointerMove(more);
  expect(screen.getByRole('tooltip').textContent).toBe('More');
  fireEvent.pointerLeave(more);
  fireEvent.pointerMove(document.body, { clientX: 1000, clientY: 1000 });
  advance(301);
  fireEvent.pointerMove(search);
  advance(999);
  expect(screen.queryByRole('tooltip')).toBeNull();
  advance(1);
  expect(screen.getByRole('tooltip').textContent).toBe('Search');
});

it('preserves inherited timing and focus behavior with Admin 7 off', () => {
  render(
    <ShadeProvider darkMode={false} isAdmin7={false}>
      <TooltipProvider delayDuration={0}>
        <NavbarActions>
          <PageHeader.Actions>
            <PageHeader.ActionGroup>
              <Tooltip>
                <TooltipTrigger>Existing action</TooltipTrigger>
                <TooltipContent>Existing tooltip</TooltipContent>
              </Tooltip>
            </PageHeader.ActionGroup>
          </PageHeader.Actions>
        </NavbarActions>
      </TooltipProvider>
    </ShadeProvider>,
  );
  const trigger = screen.getByRole('button', { name: 'Existing action' });
  fireEvent.pointerMove(trigger);
  advance(0);
  expect(screen.getByRole('tooltip').textContent).toBe('Existing tooltip');
  fireEvent.blur(window);
  expect(screen.getByRole('tooltip').textContent).toBe('Existing tooltip');
  fireEvent.pointerLeave(trigger);
  fireEvent.pointerMove(document.body, { clientX: 1000, clientY: 1000 });
  fireEvent.blur(window);
  fireEvent.focus(window);
  fireEvent.focus(trigger);
  expect(screen.getByRole('tooltip').textContent).toBe('Existing tooltip');
});
