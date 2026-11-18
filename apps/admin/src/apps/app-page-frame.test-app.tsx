/**
 * A Ghost app built with Shade, which app-page-frame.acceptance.test.tsx bundles and frames as an
 * app's page. The spec reads it through `window.__app` with `callInFrame`.
 */
import { createRoot } from 'react-dom/client';
import { connect } from '@tryghost/app-sdk';
import { ShadeApp } from '@tryghost/shade/app';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Container } from '@tryghost/shade/primitives';
import { holdSlides, slideOffset } from './app-page-frame.held-slides';

export interface TestAppRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TestAppSlide {
  duration: number;
  easing: string;
  from: number;
}

export interface TestAppSlidePoint {
  column: TestAppRect;
  backdrop: TestAppRect;
  toolbar: TestAppRect;
  pageToolbar: TestAppRect;
}

export interface TestAppBodyStyle {
  overflow: string;
  marginRight: string;
  paddingRight: string;
}

export interface TestAppHooks {
  rect(selector: string): TestAppRect | null;
  holdSlides(): void;
  slides(): TestAppSlide[];
  seek(time: number): TestAppSlidePoint;
  endSlides(): void;
  settle(): Promise<void>;
  scroll(): { x: number; y: number };
  scrolls(): boolean;
  scrollsSideways(): boolean;
  bodyStyle(): TestAppBodyStyle;
  scrollbarWidth(): number;
}

declare global {
  interface Window {
    __frameFlags?: { tall?: boolean };
  }
}

const tall = Boolean(window.__frameFlags?.tall);

const rectOf = (selector: string) => {
  const element = document.querySelector(selector);
  if (!element) {
    return null;
  }
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
};

const held: Animation[] = [];
let release = () => {};

const hooks: TestAppHooks = {
  rect: rectOf,
  holdSlides() {
    release = holdSlides(window, held);
  },
  slides: () =>
    held.map((animation) => {
      const { duration, easing } = animation.effect!.getTiming();
      return { duration: Number(duration), easing: easing ?? '', from: slideOffset(animation)! };
    }),
  seek(time) {
    for (const animation of held) {
      animation.currentTime = time;
    }
    return {
      column: rectOf('#column')!,
      backdrop: rectOf('#backdrop')!,
      toolbar: rectOf('#toolbar')!,
      pageToolbar: rectOf('#page-toolbar')!,
    };
  },
  endSlides() {
    release();
    for (const animation of held.splice(0)) {
      animation.finish();
    }
  },
  async settle() {
    await Promise.allSettled(document.getAnimations().map((animation) => animation.finished));
  },
  scroll: () => ({ x: window.scrollX, y: window.scrollY }),
  scrolls: () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
  scrollsSideways() {
    const root = document.documentElement;
    const clipped = ['hidden', 'clip'].includes(getComputedStyle(root).overflowX);
    return !clipped && root.scrollWidth > root.clientWidth;
  },
  bodyStyle() {
    const { overflow, marginRight, paddingRight } = getComputedStyle(document.body);
    return { overflow, marginRight, paddingRight };
  },
  scrollbarWidth: () => window.innerWidth - document.documentElement.clientWidth,
};
(window as unknown as { __app: TestAppHooks }).__app = hooks;

void connect().then(() => {
  const root = document.createElement('div');
  document.body.append(root);
  createRoot(root).render(
    <ShadeApp darkMode={false}>
      <div className="fixed inset-0 -z-10 bg-background" id="backdrop" />
      <Container
        className="relative flex min-h-[calc(100dvh-var(--ghost-safe-area-inset-top,0px)-var(--ghost-safe-area-inset-bottom,0px))] flex-col"
        id="column"
        size="page"
      >
        <h1 id="title">Podcast</h1>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Select defaultValue="weekly">
              <SelectTrigger id="open-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button id="open-menu">Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {tall && <div className="h-[3000px]" />}
        <div
          className="fixed bottom-[var(--ghost-safe-area-inset-bottom,0px)] left-[var(--ghost-safe-area-inset-left,0px)]"
          id="page-toolbar"
        >
          Page toolbar
        </div>
      </Container>
      <div
        className="fixed top-[calc(var(--ghost-safe-area-inset-top,0px)+80px)] right-[var(--ghost-safe-area-inset-right,0px)]"
        id="toolbar"
      >
        Toolbar
      </div>
    </ShadeApp>,
  );
});
