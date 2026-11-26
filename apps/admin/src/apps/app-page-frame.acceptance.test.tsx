import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import {
  allowUnhandledRequests,
  currentUserResponse,
  renderAdminApp,
  settleTransitions,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { holdSlides } from './app-page-frame.held-slides';
import type { TestAppHooks, TestAppSlidePoint } from './app-page-frame.test-app';
import appStylesheet from './app-page-frame.test-app.css?inline';
import { appsScreen } from './apps.screen';
import { APP_ORIGIN, fakeAppPage, fakeInstallations, installation, labs } from './apps.test-utils';

// An app's page on its own origin, which Chromium runs out of process, under real input.

const APP_ROUTE = '/apps/installation-1';

interface Point {
  x: number;
  y: number;
}

function withNavigation(mode: 'full' | 'compact') {
  const me = currentUserResponse();
  me.users[0].accessibility = JSON.stringify({
    navigation: { expanded: { posts: true, members: true }, menu: { visible: true, mode } },
  });
  return me;
}

/** Scrollbars that take room from the page, as on Windows and Linux. */
const CLASSIC_SCROLLBARS =
  '::-webkit-scrollbar { width: 15px; height: 15px; } ::-webkit-scrollbar-thumb { background: #999; }';

async function shadeAppPage({ tall = false } = {}) {
  const script = await commands.bundleFrameScript('src/apps/app-page-frame.test-app.tsx');
  // A closing tag inside the script or the stylesheet would end it early.
  const literal = (value: unknown) => JSON.stringify(value).replaceAll('</', '<\\/');
  return [
    '<!doctype html><html><head><title>Podcast app</title>',
    `<script>window.process = { env: { NODE_ENV: 'development' } }; window.__SDK_VERSION__ = '0.0.0'; window.__frameFlags = ${literal({ tall })};</script>`,
    `<style>${appStylesheet.replaceAll('</style', '<\\/style')}${CLASSIC_SCROLLBARS}</style>`,
    '</head><body>',
    `<script type="module">${script.replaceAll('</script', '<\\/script')}</script>`,
    '</body></html>',
  ].join('');
}

const inApp = <Hook extends keyof TestAppHooks>(
  hook: Hook,
  ...args: Parameters<TestAppHooks[Hook]>
) => commands.callInFrame(APP_ORIGIN, hook, args) as Promise<ReturnType<TestAppHooks[Hook]>>;

async function openApp(mode: 'full' | 'compact', html?: string) {
  allowUnhandledRequests();
  await fakeAppPage(installation(), { html });
  await renderAdminApp(APP_ROUTE, {
    labs: { ...labs, admin7Design: true },
    boot: { browseMe: { response: withNavigation(mode) } },
  });
  await expect.element(appsScreen.frame()).toBeVisible();
  await expect.poll(sidebarScreen.floatingState).toBe(mode === 'full' ? 'pinned' : 'closed');
}

async function openShadeApp(options: { tall?: boolean } = {}) {
  await openApp('full', await shadeAppPage(options));
  await expect.poll(() => inApp('rect', '#title')).not.toBeNull();
}

let pointer: Point = { x: 0, y: 0 };

async function moveTo(to: Point, steps = 1) {
  const from = pointer;
  for (let step = 1; step <= steps; step += 1) {
    const point = {
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps,
    };
    await userEvent.hover(page.elementLocator(document.documentElement), {
      position: point,
      force: true,
    });
  }
  pointer = to;
}

async function clickInApp(selector: string) {
  const box = await inApp('rect', selector);
  if (!box) {
    throw new Error(`Nothing in the app matches ${selector}`);
  }
  await userEvent.click(appsScreen.frame(), {
    position: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
  });
}

const navBox = () =>
  document.querySelector('[data-slot=floating-sidebar]')!.getBoundingClientRect();
const controlsVisible = () =>
  document.querySelector('[data-slot=floating-sidebar]')?.getAttribute('data-controls-visible');

interface SlidePoint extends TestAppSlidePoint {
  /** Admin's page's `translateX`: the slide's offset at the start, 0 at the end. */
  page: number;
  footer: number;
}

/**
 * Toggles Admin 7's navigation with its shortcut, holding Admin's and the app's slides paused, and
 * seeks both to each of `points` together.
 */
async function stepThroughSlide(points: number[]) {
  const footer = appsScreen.footer().element();
  const main = footer.closest('main')!;
  const before = {
    footer: footer.getBoundingClientRect().left,
    column: (await inApp('rect', '#column'))!.left,
  };
  const admin: Animation[] = [];
  const release = holdSlides(window, admin);
  onTestFinished(release);
  await inApp('holdSlides');

  await userEvent.keyboard('{Control>}b{/Control}');
  await expect.poll(() => admin.length).toBeGreaterThan(0);
  await expect.poll(async () => (await inApp('slides')).length).toBeGreaterThan(0);
  release();
  const slide = admin.find((animation) => (animation.effect as KeyframeEffect).target === main)!;
  const slides = { admin: slide.effect!.getTiming(), app: await inApp('slides') };

  const at: SlidePoint[] = [];
  for (const point of points) {
    const time = point * Number(slides.admin.duration);
    for (const animation of admin) {
      animation.currentTime = time;
    }
    const app = await inApp('seek', time);
    at.push({
      page: new DOMMatrixReadOnly(getComputedStyle(main).transform).m41,
      footer: footer.getBoundingClientRect().left,
      ...app,
    });
  }
  return {
    slides,
    before,
    at,
    end: async () => {
      for (const animation of admin) {
        animation.finish();
      }
      await inApp('endSlides');
    },
  };
}

describe('An app’s page beneath Admin’s chrome', () => {
  beforeEach(() => {
    fakeInstallations();
    pointer = { x: 0, y: 0 };
  });

  describe('Admin 7’s navigation', () => {
    it('closes the unpinned nav once the pointer moves on into the app’s page, and opens it again beside the circle', async () => {
      await openApp('compact');
      const circle = navBox();
      await moveTo({ x: circle.left + circle.width / 2, y: circle.top + circle.height / 2 }, 4);
      await expect.poll(sidebarScreen.floatingState).toBe('open');
      await settleTransitions();

      const open = navBox();
      const y = open.top + 20;
      await moveTo({ x: open.right - 20, y });
      await moveTo({ x: open.right + 30, y }, 5);
      let left = 0;
      let closed = 0;
      const nav = document.querySelector('[data-slot=floating-sidebar]')!;
      const onMove = (event: PointerEvent) => {
        if (!nav.parentElement!.contains(event.target as Node)) {
          left ||= event.timeStamp;
        }
      };
      document.addEventListener('pointermove', onMove);
      const observer = new MutationObserver(() => {
        if (nav.getAttribute('data-state') === 'closed') {
          closed ||= performance.now();
        }
      });
      observer.observe(nav, { attributeFilter: ['data-state'] });
      onTestFinished(() => {
        document.removeEventListener('pointermove', onMove);
        observer.disconnect();
      });
      await moveTo({ x: open.right + 140, y });
      expect(document.elementFromPoint(pointer.x, pointer.y)).toBe(appsScreen.frame().element());

      await expect.poll(sidebarScreen.floatingState, { timeout: 2000 }).toBe('closed');
      // After the same delay as when leaving it over Admin's own pages.
      expect(left).toBeGreaterThan(0);
      expect(closed - left).toBeGreaterThanOrEqual(399);

      await moveTo({ x: circle.left + circle.width / 2, y: circle.bottom + 160 }, 8);
      await expect.poll(sidebarScreen.floatingState).toBe('open');
      expect(appsScreen.frame().element().getBoundingClientRect().left).toBeLessThan(pointer.x);
    });

    it('shows the pinned nav’s controls when the pointer comes to it from the app’s page, and hides them as it goes back', async () => {
      const inPage = { x: 800, y: 400 };
      // So Admin never sees the pointer before it enters the app's page.
      await moveTo({ x: -10, y: inPage.y });
      await openApp('full');
      await moveTo(inPage);
      const nav = navBox();
      expect(controlsVisible()).toBe('false');

      await moveTo({ x: nav.left + nav.width / 2, y: nav.top + 30 }, 12);
      await expect.poll(controlsVisible).toBe('true');
      await expect.element(sidebarScreen.unpinButton()).toBeVisible();

      await moveTo(inPage, 12);
      await expect.poll(controlsVisible, { timeout: 2000 }).toBe('false');
    });
  });

  describe('as Admin 7’s navigation pins and unpins', () => {
    it('slides the app’s page with Admin’s, from where it showed', async () => {
      await openShadeApp();
      await settleTransitions();
      const points = [0, 0.05, 0.15, 0.3, 0.5, 0.8, 1];

      for (const change of ['unpin', 'pin']) {
        const { slides, before, at, end } = await stepThroughSlide(points);
        const [start, finish] = [at[0], at.at(-1)!];

        for (const slide of slides.app) {
          expect([slide.duration, slide.easing], change).toEqual([
            slides.admin.duration,
            slides.admin.easing,
          ]);
        }
        expect(Math.abs(finish.footer - before.footer), change).toBeGreaterThan(200);
        expect(Math.abs(finish.column.left - before.column), change).toBeGreaterThan(200);
        expect(start.footer, change).toBeCloseTo(before.footer, 0);
        expect(start.column.left, change).toBeCloseTo(before.column, 0);

        for (const [index, point] of at.entries()) {
          const label = `${change} at ${points[index]}`;
          const progress = 1 - point.page / start.page;
          const column = finish.column.left + (before.column - finish.column.left) * (1 - progress);
          expect(Math.abs(point.column.left - column), label).toBeLessThan(1);
          expect(point.column.width, label).toBe(finish.column.width);
          expect(point.backdrop, label).toEqual(finish.backdrop);
          expect(point.backdrop.left, label).toBe(0);
          expect(point.toolbar, label).toEqual(finish.toolbar);
          expect(point.pageToolbar, label).toEqual(finish.pageToolbar);
        }

        for (const point of points) {
          await inApp('seek', point * Number(slides.admin.duration));
          expect(await inApp('scrollsSideways'), `${change} at ${point}`).toBe(false);
        }
        await end();
      }
    });

    it('keeps a menu open in the app beside its trigger as the page slides', async () => {
      await openShadeApp();
      await clickInApp('#open-menu');
      await expect.poll(() => inApp('rect', '[role=menu]')).not.toBeNull();
      const offset = async () => {
        const [menu, trigger] = [
          await inApp('rect', '[role=menu]'),
          await inApp('rect', '#open-menu'),
        ];
        return {
          x: Math.round(menu!.left - trigger!.left),
          y: Math.round(menu!.top - trigger!.top),
        };
      };
      await inApp('settle');
      const before = await offset();
      const moved = (await inApp('rect', '#open-menu'))!.left;

      // Dispatched in Admin, as real keys would go to the app's menu, which has focus.
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
      await expect.poll(sidebarScreen.floatingState).not.toBe('pinned');
      await expect
        .poll(async () => (await inApp('rect', '#open-menu'))!.left)
        .toBeLessThan(moved - 50);
      await inApp('settle');

      await expect.poll(offset).toEqual(before);
    });
  });

  describe('opening a menu or a select', () => {
    for (const tall of [true, false]) {
      it(`leaves a page that ${tall ? 'scrolls' : 'doesn’t scroll'} where it is, scrollbar and all`, async () => {
        await openShadeApp({ tall });
        expect(await inApp('scrolls')).toBe(tall);
        const layout = async () => ({
          title: await inApp('rect', '#title'),
          toolbar: await inApp('rect', '#toolbar'),
          scrollbar: await inApp('scrollbarWidth'),
        });
        const before = await layout();

        const opens = async (trigger: string) => {
          expect(await inApp('bodyStyle'), trigger).toEqual({
            overflow: 'visible',
            marginRight: '0px',
            paddingRight: '0px',
          });
          expect(await layout(), trigger).toEqual(before);
          if (tall) {
            await userEvent.wheel(appsScreen.frame(), { delta: { y: 400 } });
            expect((await inApp('scroll')).y, trigger).toBe(0);
          }
        };

        for (const [trigger, popup] of [
          ['#open-menu', '[role=menu]'],
          ['#open-select', '[role=listbox]'],
        ]) {
          await clickInApp(trigger);
          await expect.poll(() => inApp('rect', popup), { message: trigger }).not.toBeNull();
          await opens(trigger);
          await userEvent.keyboard('{Escape}');
          await expect.poll(() => inApp('rect', popup), { message: trigger }).toBeNull();
        }
      });
    }
  });
});
