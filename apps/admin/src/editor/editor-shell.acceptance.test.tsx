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
  lexical = LONG_DOCUMENT,
) {
  fakeEditorChrome();
  const resource = `${postType}s`;
  fakeAdminEndpoint('GET', new RegExp(`^/${resource}/abc123/\\?`), {
    [resource]: [
      post({
        id: 'abc123',
        title: 'A long document',
        lexical,
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

function slowSettingsTransition() {
  const style = document.createElement('style');
  style.textContent = `[style*="--editor-settings-progress"] {
    transition-duration: 100s !important;
  }`;
  document.head.appendChild(style);
  return style;
}

function settingsTransition() {
  return document
    .getAnimations()
    .find(
      (animation) =>
        animation instanceof CSSTransition &&
        animation.transitionProperty === '--editor-settings-progress',
    );
}

function expectTranslucentSurface(element: Element) {
  const style = getComputedStyle(element);
  expect(style.backgroundColor).toMatch(/(?:,\s*0\.8|\/\s*0\.8)\)$/);
  expect(style.backdropFilter).toMatch(/blur\([1-9]/);
  expect(style.opacity).toBe('1');
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

  it('moves header actions and footer beside floating settings and scrolls each pane independently', async () => {
    fakeLongDocument('post');
    await renderAdminApp('/editor/post/abc123', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    const footerBefore = editorScreen.helpLink().element().getBoundingClientRect();
    const toggle = editorScreen.settingsToggle().element();
    const toggleBefore = toggle.getBoundingClientRect();

    await editorScreen.settingsToggle().click();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    const sidebar = editorScreen.settingsSidebar().element();
    await expect
      .poll(() => sidebar.parentElement!.getBoundingClientRect().width)
      .toBe(sidebar.getBoundingClientRect().width + 8);
    await expect.poll(() => sidebar.getBoundingClientRect().right).toBe(window.innerWidth - 8);
    const sidebarBounds = sidebar.getBoundingClientRect();
    const footerAfter = editorScreen.helpLink().element().getBoundingClientRect();
    expect(footerBefore.right - footerAfter.right).toBeCloseTo(sidebarBounds.width + 16, 0);
    expect(footerAfter.bottom).toBe(footerBefore.bottom);
    expect(footerAfter.right).toBeLessThan(sidebarBounds.left);
    expect(sidebarBounds.top).toBe(8);
    expect(sidebarBounds.bottom).toBe(window.innerHeight - 8);
    expect(sidebar.contains(editorScreen.settingsToggle().element())).toBe(false);
    expect(editorScreen.settingsToggle().element()).toBe(toggle);
    expect(toggle.getBoundingClientRect()).toEqual(toggleBefore);
    const publish = editorScreen.publishButton().element().getBoundingClientRect();
    expect(publish.right).toBe(footerAfter.right);
    expect(sidebarBounds.left - publish.right).toBe(24);
    expect(editorScreen.scrollPane().getBoundingClientRect().right).toBe(sidebarBounds.left);
    expect(editorScreen.previewButton().element().getBoundingClientRect().right).toBeLessThan(
      sidebarBounds.left,
    );
    expect(document.activeElement).toBe(editorScreen.settingsToggle().element());

    const pane = editorScreen.scrollPane();
    pane.scrollTo({ top: 700 });
    await expect.poll(() => pane.scrollTop).toBe(700);
    expect(sidebar.scrollTop).toBe(0);

    sidebar.scrollTo({ top: sidebar.scrollHeight });
    await expect.poll(() => sidebar.scrollTop).toBeGreaterThan(0);
    expect(pane.scrollTop).toBe(700);
    expect(editorScreen.helpLink().element().getBoundingClientRect().right).toBe(footerAfter.right);
    expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
    // The toggle remains reachable even after the settings list has scrolled.
    await editorScreen.settingsToggle().click();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);
    expect(document.activeElement).toBe(editorScreen.settingsToggle().element());
    expect(editorScreen.helpLink().element().getBoundingClientRect().right).toBe(
      footerBefore.right,
    );
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
      const back = editorScreen.backLink('post').element();
      const button = getComputedStyle(back);
      for (const control of [editorScreen.status(), editorScreen.wordCount()]) {
        const element = control.element();
        const style = getComputedStyle(element);
        expect(style.fontSize).toBe(button.fontSize);
        expect(element.getBoundingClientRect().height).toBe(back.getBoundingClientRect().height);
        expect(parseFloat(style.borderRadius)).toBeGreaterThanOrEqual(
          element.getBoundingClientRect().height / 2,
        );
        expectTranslucentSurface(element);
      }
      const help = editorScreen.helpLink().element().getBoundingClientRect();
      const toggle = editorScreen.settingsToggle().element().getBoundingClientRect();
      expect(help.height).toBe(back.getBoundingClientRect().height);
      expect(window.innerHeight - help.bottom).toBe(12);
      expect(back.getBoundingClientRect().top).toBe(21);
      expect(window.innerWidth - help.right).toBe(16);
      expect(window.innerWidth - toggle.right).toBe(25);

      const before = positions('post');
      const pane = editorScreen.scrollPane();
      pane.scrollTo({ top: 700 });
      await expect.poll(() => pane.scrollTop).toBe(700);
      expect(positions('post')).toEqual(before);

      const documentWidth = editorScreen.root().element().getBoundingClientRect().width;
      await editorScreen.settingsToggle().click();
      await expect.element(editorScreen.settingsSidebar()).toBeVisible();
      await expect
        .poll(() => editorScreen.settingsSidebar().element().getBoundingClientRect().right)
        .toBe(window.innerWidth - 8);
      expect(editorScreen.root().element().getBoundingClientRect().width).toBe(documentWidth);
      expect(editorScreen.settingsSidebar().element().getBoundingClientRect().top).toBe(8);
      expect(
        editorScreen.settingsSidebar().element().contains(editorScreen.settingsToggle().element()),
      ).toBe(false);
      expect(
        editorScreen.settingsSidebar().element().getBoundingClientRect().bottom,
      ).toBeLessThanOrEqual(window.innerHeight);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
    },
  );

  it('eases the sidebar and fades its contents without making header actions jump', async () => {
    fakeLongDocument('post');
    await renderAdminApp('/editor/post/abc123', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    const publishBefore = editorScreen.publishButton().element().getBoundingClientRect().right;
    const footerBefore = editorScreen.helpLink().element().getBoundingClientRect().right;
    // Hold the real transition long enough to inspect precise points on its timeline,
    // independently of browser scheduling and Playwright's actionability waits.
    const animationStyle = slowSettingsTransition();
    try {
      await editorScreen.settingsToggle().click();
      await expect.poll(settingsTransition).toBeDefined();
      const opening = settingsTransition()!;
      opening.pause();
      opening.currentTime = 0;
      const sidebar = editorScreen.settingsSidebar().element();
      const panel = sidebar.parentElement!;
      const contents = sidebar.firstElementChild!;
      expect(editorScreen.publishButton().element().getBoundingClientRect().right).toBeCloseTo(
        publishBefore,
        1,
      );
      expect(panel.getBoundingClientRect().width).toBe(0);
      expect(getComputedStyle(contents).opacity).toBe('0');
      expect(opening.effect!.getTiming().easing).not.toBe('linear');

      opening.currentTime = 50_000;
      const width = panel.getBoundingClientRect().width;
      const sidebarWidth = sidebar.getBoundingClientRect().width + 8;
      expect(width).toBeGreaterThan(0);
      expect(width).toBeLessThan(sidebarWidth);
      expect(Number(getComputedStyle(contents).opacity)).toBeGreaterThan(0);
      expect(Number(getComputedStyle(contents).opacity)).toBeLessThan(1);
      const writingPane = editorScreen.root().element().getBoundingClientRect();
      expect(writingPane.right).toBeCloseTo(window.innerWidth - width, 0);
      const remainingToggle = (footerBefore - publishBefore) * (1 - width / sidebarWidth);
      const publishDuring = editorScreen.publishButton().element().getBoundingClientRect().right;
      const footerDuring = editorScreen.helpLink().element().getBoundingClientRect().right;
      expect(publishDuring).toBeLessThan(publishBefore);
      expect(footerDuring - publishDuring).toBeCloseTo(remainingToggle, 0);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      opening.finish();
      await expect.poll(() => panel.getBoundingClientRect().width).toBe(sidebarWidth);
      expect(getComputedStyle(contents).opacity).toBe('1');

      const publishOpen = editorScreen.publishButton().element().getBoundingClientRect().right;
      await editorScreen.settingsToggle().click();
      await expect.poll(settingsTransition).toBeDefined();
      const closing = settingsTransition()!;
      closing.pause();
      closing.currentTime = 0;
      expect(editorScreen.publishButton().element().getBoundingClientRect().right).toBeCloseTo(
        publishOpen,
        1,
      );
      closing.currentTime = 50_000;
      expect(sidebar.isConnected).toBe(true);
      expect(panel.getBoundingClientRect().width).toBeGreaterThan(0);
      expect(panel.getBoundingClientRect().width).toBeLessThan(sidebarWidth);
      expect(Number(getComputedStyle(contents).opacity)).toBeGreaterThan(0);
      expect(Number(getComputedStyle(contents).opacity)).toBeLessThan(1);
      expect(editorScreen.publishButton().element().getBoundingClientRect().right).toBeGreaterThan(
        publishOpen,
      );
      closing.finish();
      await expect(editorScreen.settingsSidebar()).toHaveCount(0);
      expect(editorScreen.publishButton().element().getBoundingClientRect().right).toBeCloseTo(
        publishBefore,
        1,
      );
      expect(document.activeElement).toBe(editorScreen.settingsToggle().element());
    } finally {
      animationStyle.remove();
    }
  });

  it('reverses a closing sidebar without discarding its contents or jumping its controls', async () => {
    fakeLongDocument('post');
    await renderAdminApp('/editor/post/abc123', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    const animationStyle = slowSettingsTransition();
    try {
      await editorScreen.settingsToggle().click();
      await expect.poll(settingsTransition).toBeDefined();
      settingsTransition()!.finish();
      const sidebar = editorScreen.settingsSidebar().element();
      const panel = sidebar.parentElement!;
      await expect
        .poll(() => panel.getBoundingClientRect().width)
        .toBe(sidebar.getBoundingClientRect().width + 8);

      await editorScreen.settingsToggle().click();
      await expect.poll(settingsTransition).toBeDefined();
      const closing = settingsTransition()!;
      closing.pause();
      closing.currentTime = 50_000;
      const widthBefore = panel.getBoundingClientRect().width;
      const publishBefore = editorScreen.publishButton().element().getBoundingClientRect().right;
      // The stationary toggle remains usable from the keyboard as the sidebar recedes.
      await userEvent.keyboard(' ');
      await expect.poll(() => settingsTransition() !== closing).toBe(true);
      const reopening = settingsTransition()!;
      reopening.pause();
      reopening.currentTime = 0;
      expect(editorScreen.settingsSidebar().element()).toBe(sidebar);
      expect(panel.getBoundingClientRect().width).toBeCloseTo(widthBefore, 1);
      expect(editorScreen.publishButton().element().getBoundingClientRect().right).toBeCloseTo(
        publishBefore,
        1,
      );
      reopening.finish();
      await expect
        .poll(() => panel.getBoundingClientRect().width)
        .toBe(sidebar.getBoundingClientRect().width + 8);
      expect(editorScreen.settingsSidebar().element()).toBe(sidebar);
      expect(document.activeElement).toBe(editorScreen.settingsToggle().element());
    } finally {
      animationStyle.remove();
    }
  });

  it('preserves document focus when writing resumes during sidebar closing', async () => {
    fakeLongDocument('post');
    await renderAdminApp('/editor/post/abc123', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    const animationStyle = slowSettingsTransition();
    try {
      await editorScreen.settingsToggle().click();
      await expect.poll(settingsTransition).toBeDefined();
      settingsTransition()!.finish();
      const sidebar = editorScreen.settingsSidebar().element();
      await expect
        .poll(() => sidebar.parentElement!.getBoundingClientRect().width)
        .toBe(sidebar.getBoundingClientRect().width + 8);
      await editorScreen.settingsToggle().click();
      await expect.poll(settingsTransition).toBeDefined();
      const closing = settingsTransition()!;
      closing.pause();
      closing.currentTime = 50_000;
      editorScreen.titleInput().element().focus();
      closing.finish();
      await expect(editorScreen.settingsSidebar()).toHaveCount(0);
      expect(document.activeElement).toBe(editorScreen.titleInput().element());
    } finally {
      animationStyle.remove();
    }
  });

  it('keeps one stationary sidebar toggle across subviews and omits its tooltip', async () => {
    fakeLongDocument('post');
    await renderAdminApp('/editor/post/abc123', {
      ...FLAG_ON,
      labs: { editorReact: true, admin7Pill: true },
    });
    await expect.element(editorScreen.body()).toBeVisible();
    const toggle = editorScreen.settingsToggle().element();
    const toggleBefore = toggle.getBoundingClientRect();
    // Header tooltips open immediately on focus; Settings deliberately has none.
    editorScreen.settingsToggle().element().focus();
    expect(editorScreen.settingsToggle().element().getAttribute('aria-describedby')).toBeNull();
    await editorScreen.settingsToggle().click();
    await editorScreen.settingsSubviewRow('Code injection').click();
    await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
    const sidebar = editorScreen.settingsSidebar().element();
    await expect.poll(() => sidebar.getBoundingClientRect().right).toBe(window.innerWidth - 8);
    expect(sidebar.getBoundingClientRect().width).toBe(492);
    await expect(editorScreen.settingsToggle()).toHaveCount(1);
    expect(editorScreen.settingsToggle().element()).toBe(toggle);
    expect(toggle.getBoundingClientRect()).toEqual(toggleBefore);
    expect(sidebar.contains(editorScreen.settingsToggle().element())).toBe(false);
    expect(editorScreen.publishButton().element().getBoundingClientRect().right).toBeLessThan(
      sidebar.getBoundingClientRect().left,
    );
    await editorScreen.settingsToggle().click();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);
    expect(document.activeElement).toBe(editorScreen.settingsToggle().element());
  });

  it('keeps a full-width image inside the writing pane beside normal and wide settings', async () => {
    const imageUrl = URL.createObjectURL(
      new Blob(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400"><rect width="1600" height="400" fill="gray"/></svg>',
        ],
        { type: 'image/svg+xml' },
      ),
    );
    try {
      const lexical = JSON.parse(buildLexicalParagraph('Below the image')) as {
        root: { children: Record<string, unknown>[] };
      };
      lexical.root.children.unshift({
        type: 'image',
        version: 1,
        src: imageUrl,
        alt: 'Full-width landscape',
        width: 1600,
        height: 400,
        cardWidth: 'full',
      });
      fakeLongDocument('post', 'draft', JSON.stringify(lexical));
      await renderAdminApp('/editor/post/abc123', FLAG_ON);
      const image = editorScreen.body().getByRole('img', { name: 'Full-width landscape' });
      await expect.element(image).toBeVisible();
      const pane = editorScreen.scrollPane();
      const closedWidth = image.element().getBoundingClientRect().width;

      await editorScreen.settingsToggle().click();
      const sidebar = editorScreen.settingsSidebar().element();
      await expect.poll(() => sidebar.parentElement!.getBoundingClientRect().width).toBe(350);
      await expect
        .poll(() => image.element().getBoundingClientRect().right)
        .toBeCloseTo(pane.getBoundingClientRect().right - 12, 0);
      expect(image.element().getBoundingClientRect().left).toBeCloseTo(
        pane.getBoundingClientRect().left,
        0,
      );
      expect(pane.scrollWidth).toBe(pane.clientWidth);
      expect(pane.getBoundingClientRect().right).toBe(sidebar.getBoundingClientRect().left);

      await editorScreen.settingsSubviewRow('Code injection').click();
      await expect.poll(() => sidebar.parentElement!.getBoundingClientRect().width).toBe(500);
      await expect
        .poll(() => image.element().getBoundingClientRect().right)
        .toBeCloseTo(pane.getBoundingClientRect().right - 12, 0);
      expect(pane.scrollWidth).toBe(pane.clientWidth);

      await editorScreen.settingsToggle().click();
      await expect(editorScreen.settingsSidebar()).toHaveCount(0);
      await expect
        .poll(() => image.element().getBoundingClientRect().width)
        .toBeCloseTo(closedWidth, 0);
      // Koenig's breakout card border extends one pixel beyond the canvas.
      expect(pane.scrollWidth).toBeLessThanOrEqual(pane.clientWidth + 1);
      expect(getComputedStyle(pane).overflowX).toBe('hidden');
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  });

  it('keeps a long save error readable inside the header on a narrow screen', async () => {
    await page.viewport(390, 844);
    fakeLongDocument('post');
    const message =
      'Saving failed: this post contains a value that is too long. Shorten the value and try saving again.';
    fakeAdminEndpoint(
      'PUT',
      /^\/posts\/abc123\/\?/,
      {
        errors: [{ type: 'ValidationError', message }],
      },
      { status: 422 },
    );
    await renderAdminApp('/editor/post/abc123', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    await editorScreen.body().click();
    await userEvent.keyboard('{End} more');
    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.element(editorScreen.status()).toHaveTextContent(message);
    const status = editorScreen.status().element();
    const bounds = status.getBoundingClientRect();
    expect(bounds.right).toBeLessThanOrEqual(window.innerWidth);
    expect(status.scrollWidth).toBeLessThanOrEqual(status.clientWidth);
    expect(status.scrollHeight).toBeLessThanOrEqual(status.clientHeight);
    expect(bounds.top).toBeGreaterThanOrEqual(
      editorScreen.publishButton().element().getBoundingClientRect().bottom,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

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
    'keeps the $status action translucent and blurred against the $theme canvas',
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
      expectTranslucentSurface(action.element());
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
