import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StickyFooter,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { PageHeader } from '@tryghost/shade/patterns';
import { ListPage } from '@tryghost/shade/page-templates';
import { renderInApp } from '@test-utils/acceptance';

/*
 * Shade's surfaces in an app's safe area, set as `--ghost-safe-area-inset-*` on `<html>`.
 */

const WINDOW = { width: 1280, height: 720 };
// Admin 7's, with its navigation pinned.
const INSETS = { top: 44, right: 8, bottom: 65, left: 293 };

const setInsets = (insets: typeof INSETS | undefined) => {
  for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
    const name = `--ghost-safe-area-inset-${edge}`;
    if (insets) {
      document.documentElement.style.setProperty(name, `${insets[edge]}px`);
    } else {
      document.documentElement.style.removeProperty(name);
    }
  }
};

/** Waits out the opening animations, which scale and slide what they open. */
const settle = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 700);
  });

const box = (element: Element) => element.getBoundingClientRect();
const byRole = (role: string) => document.querySelector(`[role=${role}]`)!;
const byTestId = (id: string) => document.querySelector(`[data-testid=${id}]`)!;

const insideSafeArea = (inner: DOMRect) => ({
  top: inner.top >= INSETS.top - 1,
  right: inner.right <= WINDOW.width - INSETS.right + 1,
  bottom: inner.bottom <= WINDOW.height - INSETS.bottom + 1,
  left: inner.left >= INSETS.left - 1,
});
const INSIDE = { top: true, right: true, bottom: true, left: true };

beforeEach(async () => {
  await page.viewport(WINDOW.width, WINDOW.height);
});

afterEach(() => {
  setInsets(undefined);
  window.scrollTo(0, 0);
});

const OpenPopups = ({ top }: { top: number }) => (
  <>
    <Popover open>
      <PopoverTrigger style={{ position: 'fixed', left: 300, top }}>Popover</PopoverTrigger>
      <PopoverContent data-testid="popover" side="bottom">
        <div style={{ height: 60 }} />
      </PopoverContent>
    </Popover>
    <DropdownMenu modal={false} open>
      <DropdownMenuTrigger style={{ position: 'fixed', left: 500, top }}>Menu</DropdownMenuTrigger>
      <DropdownMenuContent data-testid="menu">
        <DropdownMenuItem>One</DropdownMenuItem>
        <DropdownMenuItem>Two</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Select open>
      <SelectTrigger style={{ position: 'fixed', left: 700, top, width: 120 }}>
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent data-testid="select">
        <SelectItem value="one">One</SelectItem>
        <SelectItem value="two">Two</SelectItem>
      </SelectContent>
    </Select>
    <Tooltip open>
      <TooltipTrigger style={{ position: 'fixed', left: 900, top }}>Tooltip</TooltipTrigger>
      <TooltipContent data-testid="tooltip" side="bottom">
        <div style={{ height: 60 }}>Tooltip</div>
      </TooltipContent>
    </Tooltip>
  </>
);
const POPUPS = ['popover', 'menu', 'select', 'tooltip'];

const ItemAlignedSelect = () => (
  <Select open>
    <SelectTrigger style={{ position: 'fixed', left: 600, top: 560, width: 160 }}>
      <SelectValue placeholder="Select" />
    </SelectTrigger>
    <SelectContent position="item-aligned">
      {Array.from({ length: 30 }, (_, index) => (
        <SelectItem key={index} value={`${index + 1}`}>
          Item {index + 1}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const LongPage = () => (
  <>
    <div style={{ height: 2000 }} />
    <StickyFooter>
      <button type="button">Save</button>
    </StickyFooter>
  </>
);

const Headers = () => (
  <>
    <PageHeader>
      <PageHeader.Left>
        <PageHeader.Title>Page header</PageHeader.Title>
      </PageHeader.Left>
    </PageHeader>
    <ListPage>
      <ListPage.Header data-testid="list-page-header">List page header</ListPage.Header>
      <ListPage.Body>
        <div style={{ height: 3000 }} />
      </ListPage.Body>
    </ListPage>
  </>
);

describe('outside an app, with no safe area', () => {
  it('leaves a select item-aligned, as asked', async () => {
    await renderInApp(<ItemAlignedSelect />);
    await settle();

    expect(byRole('listbox').closest('[data-side]')).toBeNull();
  });

  it('leaves a sticky footer at the window’s bottom', async () => {
    await renderInApp(<LongPage />);
    await settle();

    const row = page.getByText('Save').element().parentElement!;
    expect(Math.round(box(row).bottom)).toBe(WINDOW.height);
  });

  it('leaves page headers sticking at the window’s top', async () => {
    await renderInApp(<Headers />);
    window.scrollTo(0, 1000);
    await settle();

    expect(Math.round(box(document.querySelector('[data-page-header=page-header]')!).top)).toBe(0);
    expect(Math.round(box(byTestId('list-page-header')).top)).toBe(0);
  });
});

describe('in an app’s page, with Admin 7’s safe area', () => {
  beforeEach(() => setInsets(INSETS));

  it('moves open popups as the safe area changes', async () => {
    await renderInApp(<OpenPopups top={300} />);
    await settle();
    const edge = 380;
    for (const id of POPUPS) {
      expect(box(byTestId(id)).bottom, id).toBeGreaterThan(edge);
    }

    setInsets({ ...INSETS, bottom: WINDOW.height - edge });
    await settle();

    for (const id of POPUPS) {
      expect(box(byTestId(id)).bottom, id).toBeLessThanOrEqual(edge + 1);
    }
  });

  it('opens an item-aligned select as a popper, so it keeps inside the safe area', async () => {
    await renderInApp(<ItemAlignedSelect />);
    await settle();

    expect(insideSafeArea(box(byRole('listbox')))).toEqual(INSIDE);
  });

  it('sticks a footer at the safe area’s bottom, above Admin’s footer', async () => {
    await renderInApp(<LongPage />);
    await settle();

    const row = page.getByText('Save').element().parentElement!;
    expect(Math.round(box(row).bottom)).toBe(WINDOW.height - INSETS.bottom);
  });

  it('sticks page headers at the safe area’s top, below Admin’s chrome', async () => {
    await renderInApp(<Headers />);
    window.scrollTo(0, 1000);
    await settle();

    expect(Math.round(box(document.querySelector('[data-page-header=page-header]')!).top)).toBe(
      INSETS.top,
    );
    expect(Math.round(box(byTestId('list-page-header')).top)).toBe(INSETS.top);
  });
});
