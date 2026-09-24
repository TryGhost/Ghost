import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  post,
  renderAdminApp,
  staffRole,
  withoutAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
const LONG_DOCUMENT = buildLexicalParagraph(
  'A long document keeps its editor controls in reach. '.repeat(500),
);
let originalFontSize: string;

beforeEach(() => {
  // The production Ember host sets this baseline in patterns/global.css.
  // This suite measures the real control sizes; the acceptance host omits that stylesheet.
  originalFontSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '62.5%';
});

function fakeLongDocument(
  postType: 'post' | 'page',
  status: 'draft' | 'published' | 'scheduled' = 'draft',
) {
  fakeEditorChrome();
  const resource = `${postType}s`;
  fakeAdminEndpoint('GET', new RegExp(`^/${resource}/abc123/\\?`), {
    [resource]: [
      post({
        id: 'abc123',
        title: 'A long document',
        lexical: LONG_DOCUMENT,
        status,
        published_at:
          status === 'scheduled' ? '2027-01-01T12:00:00.000Z' : '2026-01-01T12:00:00.000Z',
        tags: [],
        authors: [{ id: '1' }],
      }),
    ],
  });
}

function controls(postType: 'post' | 'page') {
  return [
    editorScreen.backLink(postType),
    editorScreen.status(),
    editorScreen.previewButton(),
    editorScreen.publishButton(),
    editorScreen.settingsToggle(),
    editorScreen.wordCount(),
    editorScreen.helpLink(),
  ];
}

function positions(postType: 'post' | 'page') {
  return controls(postType).map((control) => {
    const { x, y, width, height } = control.element().getBoundingClientRect();
    return { x, y, width, height };
  });
}

function canvasBackground(): string {
  let surface: Element | null = editorScreen.root().element();
  while (surface) {
    const background = getComputedStyle(surface).backgroundColor;
    if (background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)') {
      return background;
    }
    surface = surface.parentElement;
  }
  throw new Error('The editor canvas has no opaque background');
}

afterEach(async () => {
  document.documentElement.style.fontSize = originalFontSize;
  await page.viewport(1280, 800);
});

describe('Floating editor shell', () => {
  it.each(['post', 'page'] as const)(
    'keeps %s controls in the viewport while only the document scrolls',
    async (postType) => {
      fakeLongDocument(postType);
      await renderAdminApp(`/editor/${postType}/abc123`, FLAG_ON);
      await expect.element(editorScreen.body()).toBeVisible();
      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await expect
        .poll(() => editorScreen.wordCount().element().getBoundingClientRect().bottom)
        .toBeLessThanOrEqual(window.innerHeight);

      const before = positions(postType);
      const pane = editorScreen.scrollPane();
      const titleTop = editorScreen.titleInput().element().getBoundingClientRect().top;
      expect(pane.getBoundingClientRect().top).toBe(0);
      expect(pane.scrollHeight).toBeGreaterThan(pane.clientHeight);
      pane.scrollTo({ top: 700 });

      await expect.poll(() => pane.scrollTop).toBe(700);
      await expect
        .poll(() => editorScreen.titleInput().element().getBoundingClientRect().top)
        .toBeLessThan(titleTop - 600);
      expect(positions(postType)).toEqual(before);
      // The gap between the anchored controls stays part of the document:
      // writing underneath it remains visible and can still receive pointer input.
      const back = editorScreen.backLink(postType).element().getBoundingClientRect();
      const atHeaderGap = document.elementFromPoint(
        window.innerWidth / 2,
        back.top + back.height / 2,
      );
      expect(editorScreen.body().element().contains(atHeaderGap)).toBe(true);
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
    },
  );

  it('moves the footer beside desktop settings and scrolls each pane independently', async () => {
    fakeLongDocument('post');
    await renderAdminApp('/editor/post/abc123', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    const footerBefore = editorScreen.helpLink().element().getBoundingClientRect();

    await editorScreen.settingsToggle().click();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    const sidebar = editorScreen.settingsSidebar().element();
    const sidebarBounds = sidebar.getBoundingClientRect();
    const footerAfter = editorScreen.helpLink().element().getBoundingClientRect();
    expect(footerBefore.right - footerAfter.right).toBeCloseTo(sidebarBounds.width, 0);
    expect(footerAfter.bottom).toBe(footerBefore.bottom);
    expect(footerAfter.right).toBeLessThan(sidebarBounds.left);
    expect(sidebarBounds.bottom).toBeLessThanOrEqual(window.innerHeight);

    const pane = editorScreen.scrollPane();
    pane.scrollTo({ top: 700 });
    await expect.poll(() => pane.scrollTop).toBe(700);
    expect(sidebar.scrollTop).toBe(0);

    sidebar.scrollTo({ top: sidebar.scrollHeight });
    await expect.poll(() => sidebar.scrollTop).toBeGreaterThan(0);
    expect(pane.scrollTop).toBe(700);
    expect(editorScreen.helpLink().element().getBoundingClientRect().right).toBe(footerAfter.right);
    expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
  });

  it.each([
    { admin7Pill: false, theme: 'light' },
    { admin7Pill: true, theme: 'dark' },
  ])(
    'keeps controls in a narrow $theme viewport (Admin 7: $admin7Pill) and overlays settings',
    async ({ admin7Pill, theme }) => {
      await page.viewport(390, 844);
      fakeLongDocument('post');
      const me = currentUserResponse();
      me.users[0].accessibility = JSON.stringify({ nightShift: theme });
      await renderAdminApp('/editor/post/abc123', {
        ...FLAG_ON,
        labs: { editorReact: true, admin7Pill },
        boot: { browseMe: { response: me } },
      });
      await expect.element(editorScreen.body()).toBeVisible();
      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await expect
        .poll(() => document.documentElement.classList.contains('dark'))
        .toBe(theme === 'dark');

      for (const { x, y, width, height } of positions('post')) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + width).toBeLessThanOrEqual(window.innerWidth);
        expect(y + height).toBeLessThanOrEqual(window.innerHeight);
      }
      const before = positions('post');
      const pane = editorScreen.scrollPane();
      pane.scrollTo({ top: 700 });
      await expect.poll(() => pane.scrollTop).toBe(700);
      expect(positions('post')).toEqual(before);

      const documentWidth = editorScreen.root().element().getBoundingClientRect().width;
      await editorScreen.settingsToggle().click();
      await expect.element(editorScreen.settingsSidebar()).toBeVisible();
      expect(editorScreen.root().element().getBoundingClientRect().width).toBe(documentWidth);
      expect(
        editorScreen.settingsSidebar().element().getBoundingClientRect().bottom,
      ).toBeLessThanOrEqual(window.innerHeight);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
    },
  );

  it('bounds the contributor layout and keeps its controls anchored while writing', async () => {
    fakeLongDocument('post');
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Contributor' })];
    await renderAdminApp('/editor/post/abc123', {
      ...FLAG_ON,
      boot: { browseMe: { response: me } },
    });
    await expect.element(editorScreen.body()).toBeVisible();
    const visibleControls = [
      editorScreen.backLink('post'),
      editorScreen.status(),
      editorScreen.settingsToggle(),
      editorScreen.wordCount(),
      editorScreen.helpLink(),
    ];
    const before = visibleControls.map((control) => control.element().getBoundingClientRect().top);
    expect(editorScreen.helpLink().element().getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );
    const pane = editorScreen.scrollPane();
    pane.scrollTo({ top: 700 });
    await expect.poll(() => pane.scrollTop).toBe(700);
    expect(visibleControls.map((control) => control.element().getBoundingClientRect().top)).toEqual(
      before,
    );
    expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
  });

  it.each([
    { status: 'published', theme: 'light' },
    { status: 'scheduled', theme: 'dark' },
  ] as const)(
    'keeps the $status action opaque against the $theme canvas',
    async ({ status, theme }) => {
      fakeLongDocument('post', status);
      const me = currentUserResponse();
      me.users[0].accessibility = JSON.stringify({ nightShift: theme });
      await renderAdminApp('/editor/post/abc123', {
        ...FLAG_ON,
        boot: { browseMe: { response: me } },
      });
      await expect.element(editorScreen.body()).toBeVisible();
      const action =
        status === 'published' ? editorScreen.unpublishButton() : editorScreen.unscheduleButton();
      await expect.element(action).toBeVisible();
      await expect
        .poll(() => document.documentElement.classList.contains('dark'))
        .toBe(theme === 'dark');
      const pane = editorScreen.scrollPane();
      pane.scrollTo({ top: 700 });
      await expect.poll(() => pane.scrollTop).toBe(700);
      expect(getComputedStyle(action.element()).backgroundColor).toBe(canvasBackground());
      expect(getComputedStyle(action.element()).opacity).toBe('1');
    },
  );

  it.each([1280, 390])(
    'reserves space for a session warning beneath the header at %spx while keeping the footer anchored',
    async (width) => {
      await page.viewport(width, 800);
      fakeLongDocument('post');
      fakeAdminEndpoint(
        'PUT',
        /^\/posts\/abc123\/\?/,
        {
          errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }],
        },
        { status: 401 },
      );
      await renderAdminApp('/editor/post/abc123', FLAG_ON);
      await expect.element(editorScreen.body()).toBeVisible();
      const headerBefore = editorScreen.settingsToggle().element().getBoundingClientRect();
      const footerBefore = editorScreen.helpLink().element().getBoundingClientRect();
      const pane = editorScreen.scrollPane();
      const paneHeight = pane.clientHeight;

      await editorScreen.body().click();
      await userEvent.keyboard('{End} more');
      await userEvent.keyboard('{Meta>}s{/Meta}');
      await expect.element(editorScreen.reauthBanner()).toBeVisible();

      const banner = editorScreen.reauthBanner().element().getBoundingClientRect();
      expect(banner.top).toBeGreaterThanOrEqual(headerBefore.bottom);
      expect(pane.getBoundingClientRect().top).toBeGreaterThanOrEqual(banner.bottom);
      expect(pane.clientHeight).toBeLessThan(paneHeight);
      expect(editorScreen.settingsToggle().element().getBoundingClientRect().top).toBe(
        headerBefore.top,
      );
      expect(editorScreen.helpLink().element().getBoundingClientRect().bottom).toBe(
        footerBefore.bottom,
      );

      pane.scrollTo({ top: 700 });
      await expect.poll(() => pane.scrollTop).toBe(700);
      expect(editorScreen.reauthBanner().element().getBoundingClientRect().top).toBe(banner.top);
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      expect(banner.left).toBeGreaterThanOrEqual(0);
      expect(banner.right).toBeLessThanOrEqual(window.innerWidth);
      expect(
        editorScreen.settingsToggle().element().getBoundingClientRect().right,
      ).toBeLessThanOrEqual(window.innerWidth);
    },
  );
});
