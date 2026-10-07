import { afterEach, describe, expect, it } from 'vitest';
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

const HELD_DURATION = 100_000;
/** The editor's own parts that move with the settings panel, and Koenig's cards that ease with it. */
const SETTINGS_MOTION = '[class*="editor-settings-motion-"], [data-settings-moving] [data-kg-card]';

/** Holds the real settings motion long enough to inspect precise points on its timeline. */
function slowSettingsTransition() {
  const style = document.createElement('style');
  style.textContent = `:is(${SETTINGS_MOTION}) {
    transition-duration: ${HELD_DURATION / 1000}s !important;
  }`;
  document.head.appendChild(style);
  return style;
}

function settingsTransitions() {
  return document.getAnimations().filter((animation): animation is CSSTransition => {
    const target = (animation.effect as KeyframeEffect | null)?.target;
    return animation instanceof CSSTransition && !!target?.matches(SETTINGS_MOTION);
  });
}

/**
 * The panel, its contents, the writing pane, the footer, and the header's
 * padding, action gap and toggle slot each move with the settings panel.
 */
const SETTINGS_MOTION_PARTS = 7;

/** Waits for every part of a settings motion that started after `previous`, held at its start. */
async function heldSettingsMotion(previous: CSSTransition[] = [], parts = SETTINGS_MOTION_PARTS) {
  const started = () => settingsTransitions().filter((t) => !previous.includes(t));
  await expect.poll(() => started().length).toBe(parts);
  const transitions = started();
  const motion = {
    transitions,
    seek(time: number) {
      for (const transition of transitions) {
        transition.pause();
        transition.currentTime = time;
      }
    },
    finish() {
      for (const transition of transitions) {
        transition.finish();
      }
    },
  };
  motion.seek(0);
  return motion;
}

/**
 * Animating a custom property that the editor document inherits restyles the
 * whole document on every frame, which makes the motion choppy in long posts.
 */
function expectNoAnimatedCustomProperty() {
  const animated = document
    .getAnimations()
    .filter(
      (animation) =>
        animation instanceof CSSTransition && animation.transitionProperty.startsWith('--'),
    );
  expect(animated).toHaveLength(0);
}

/** An image card at `cardWidth` in a lexical document, from an SVG the caller revokes. */
function breakoutImage(cardWidth: 'wide' | 'full', alt: string) {
  const src = URL.createObjectURL(
    new Blob(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400"><rect width="1600" height="400" fill="gray"/></svg>',
      ],
      { type: 'image/svg+xml' },
    ),
  );
  return {
    src,
    node: { type: 'image', version: 1, src, alt, width: 1600, height: 400, cardWidth },
  };
}

/**
 * A full card spans the writing area edge to edge; a wide card is 75vw less the
 * width beside the writing area (wide enough here to clear its minimum), centred on
 * it. Both cards' borders extend 1px
 * beyond those bounds.
 */
function expectBreakoutsFitWritingArea(fullImage: Element, wideImage: Element) {
  const area = editorScreen.scrollPane().firstElementChild!.getBoundingClientRect();
  const full = fullImage.closest('[data-kg-card]')!.getBoundingClientRect();
  expect(full.left).toBeCloseTo(area.left - 1, 1);
  expect(full.right).toBeCloseTo(area.right + 1, 1);
  const wide = wideImage.closest('[data-kg-card]')!.getBoundingClientRect();
  expect(wide.width).toBeCloseTo(
    window.innerWidth * 0.75 - (window.innerWidth - area.width) + 2,
    1,
  );
  expect(wide.left + wide.width / 2).toBeCloseTo(area.left + area.width / 2, 1);
}

/**
 * At rest the adjustment computes to the pixels Koenig's card settings panel
 * parses to keep itself beside the writing area.
 */
function expectPixelAdjustment(card: Element) {
  const area = editorScreen.scrollPane().firstElementChild!.getBoundingClientRect();
  expect(getComputedStyle(card).getPropertyValue('--kg-breakout-adjustment')).toBe(
    `${window.innerWidth - area.width}px`,
  );
}

/** Lets a frame pass, so resize observers reporting the last layout have run. */
function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Newsletters answer 500, which fails the header's publish inputs. */
function failPublishInputs() {
  fakeAdminEndpoint(
    'GET',
    /^\/newsletters\//,
    { errors: [{ type: 'InternalServerError', message: 'Newsletters are unavailable.' }] },
    { status: 500 },
  );
}

/** Every header action lies wholly on screen and clear of the floating settings toggle. */
function expectHeaderActionsOnScreen(buttons: number) {
  const toggle = editorScreen.settingsToggle().element();
  const actions = editorScreen.headerActions().getByRole('button').elements();
  expect(actions).toHaveLength(buttons);
  for (const action of [editorScreen.backLink('post').element(), ...actions, toggle]) {
    const { left, top, right, bottom } = action.getBoundingClientRect();
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(window.innerWidth);
    expect(bottom).toBeLessThanOrEqual(window.innerHeight);
  }
  const toggleBounds = toggle.getBoundingClientRect();
  for (const action of actions) {
    const { right, top } = action.getBoundingClientRect();
    expect(right <= toggleBounds.left || top >= toggleBounds.bottom).toBe(true);
  }
}

function expectTranslucentSurface(element: Element) {
  const style = getComputedStyle(element);
  expect(style.backgroundColor).toMatch(/(?:,\s*0\.8|\/\s*0\.8)\)$/);
  expect(style.backdropFilter).toMatch(/blur\([1-9]/);
  expect(style.opacity).toBe('1');
}

afterEach(async () => {
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
    const settingsPane = editorScreen.settingsScrollPane();
    const heading = editorScreen
      .settingsSidebar()
      .getByRole('heading', { name: 'Post settings', exact: true })
      .element();
    const headingBefore = heading.getBoundingClientRect();
    const fieldsBefore = editorScreen.settingsSlug().element().getBoundingClientRect();
    expect(settingsPane.contains(heading)).toBe(false);
    pane.scrollTo({ top: 700 });
    await expect.poll(() => pane.scrollTop).toBe(700);
    expect(settingsPane.scrollTop).toBe(0);

    settingsPane.scrollTo({ top: settingsPane.scrollHeight });
    await expect.poll(() => settingsPane.scrollTop).toBeGreaterThan(0);
    expect(heading.getBoundingClientRect()).toEqual(headingBefore);
    expect(editorScreen.settingsSlug().element().getBoundingClientRect().top).toBeLessThan(
      fieldsBefore.top,
    );
    expect(sidebar.scrollTop).toBe(0);
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

  it.each(['light', 'dark'])(
    'keeps controls in a narrow %s viewport and overlays settings',
    async (theme) => {
      await page.viewport(390, 844);
      fakeLongDocument('post');
      const me = currentUserResponse();
      me.users[0].accessibility = JSON.stringify({ nightShift: theme });
      await renderAdminApp('/editor/post/abc123', {
        ...FLAG_ON,
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

  it.each([
    { status: 'published', inputs: 'loaded' },
    { status: 'scheduled', inputs: 'loaded' },
    { status: 'published', inputs: 'failed' },
    { status: 'scheduled', inputs: 'failed' },
  ] as const)(
    'keeps a $status post’s actions on a narrow screen with publish inputs $inputs',
    async ({ status, inputs }) => {
      await page.viewport(390, 844);
      fakeLongDocument('post', status);
      if (inputs === 'failed') {
        failPublishInputs();
      }
      await renderAdminApp('/editor/post/abc123', FLAG_ON);
      await expect.element(editorScreen.body()).toBeVisible();
      await expect.element(editorScreen.updateButton()).toBeVisible();
      if (inputs === 'failed') {
        await expect.element(editorScreen.publishInputsError()).toBeVisible();
      }

      // Unpublish or Unschedule and Update, plus Retry when the load failed.
      expectHeaderActionsOnScreen(inputs === 'failed' ? 3 : 2);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
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
      const opening = await heldSettingsMotion();
      expectNoAnimatedCustomProperty();
      const sidebar = editorScreen.settingsSidebar().element();
      const panel = sidebar.parentElement!;
      const contents = sidebar.firstElementChild!;
      expect(editorScreen.publishButton().element().getBoundingClientRect().right).toBeCloseTo(
        publishBefore,
        1,
      );
      expect(panel.getBoundingClientRect().width).toBe(0);
      expect(getComputedStyle(contents).opacity).toBe('0');
      for (const transition of opening.transitions) {
        expect(transition.effect!.getTiming().easing).not.toBe('linear');
      }

      opening.seek(HELD_DURATION / 2);
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
      const closing = await heldSettingsMotion(opening.transitions);
      expectNoAnimatedCustomProperty();
      expect(editorScreen.publishButton().element().getBoundingClientRect().right).toBeCloseTo(
        publishOpen,
        1,
      );
      closing.seek(HELD_DURATION / 2);
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
      const opening = await heldSettingsMotion();
      opening.finish();
      const sidebar = editorScreen.settingsSidebar().element();
      const panel = sidebar.parentElement!;
      await expect
        .poll(() => panel.getBoundingClientRect().width)
        .toBe(sidebar.getBoundingClientRect().width + 8);

      await editorScreen.settingsToggle().click();
      const closing = await heldSettingsMotion(opening.transitions);
      closing.seek(HELD_DURATION / 2);
      const widthBefore = panel.getBoundingClientRect().width;
      const publishBefore = editorScreen.publishButton().element().getBoundingClientRect().right;
      // The stationary toggle remains usable from the keyboard as the sidebar recedes.
      await userEvent.keyboard(' ');
      const reopening = await heldSettingsMotion(closing.transitions);
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
      const opening = await heldSettingsMotion();
      opening.finish();
      const sidebar = editorScreen.settingsSidebar().element();
      await expect
        .poll(() => sidebar.parentElement!.getBoundingClientRect().width)
        .toBe(sidebar.getBoundingClientRect().width + 8);
      await editorScreen.settingsToggle().click();
      const closing = await heldSettingsMotion(opening.transitions);
      closing.seek(HELD_DURATION / 2);
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
    expect(sidebar.getBoundingClientRect().width).toBe(342);
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

  it('keeps a full-width image inside the writing pane beside the settings list and its subpanels', async () => {
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
      await expect.poll(() => sidebar.parentElement!.getBoundingClientRect().width).toBe(350);
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

  it('keeps wide and full cards fitted to the writing area at every point of the settings motion', async () => {
    await page.viewport(1920, 1000);
    const full = breakoutImage('full', 'Full-width landscape');
    const wide = breakoutImage('wide', 'Wide landscape');
    try {
      const lexical = JSON.parse(buildLexicalParagraph('Between the images')) as {
        root: { children: Record<string, unknown>[] };
      };
      lexical.root.children.unshift(full.node);
      lexical.root.children.push(wide.node);
      fakeLongDocument('post', 'draft', JSON.stringify(lexical));
      await renderAdminApp('/editor/post/abc123', FLAG_ON);
      const fullImage = editorScreen.body().getByRole('img', { name: 'Full-width landscape' });
      const wideImage = editorScreen.body().getByRole('img', { name: 'Wide landscape' });
      await expect.element(fullImage).toBeVisible();
      await expect.element(wideImage).toBeVisible();
      const writingArea = editorScreen.scrollPane().firstElementChild as HTMLElement;
      expectBreakoutsFitWritingArea(fullImage.element(), wideImage.element());

      const animationStyle = slowSettingsTransition();
      try {
        // The full card eases its width and margins, the wide card those and its offset.
        const cardParts = 3 + 4;
        await editorScreen.settingsToggle().click();
        const opening = await heldSettingsMotion([], SETTINGS_MOTION_PARTS + cardParts);
        expectNoAnimatedCustomProperty();
        expectBreakoutsFitWritingArea(fullImage.element(), wideImage.element());
        // Nothing beside the writing area is rewritten while it narrows: an
        // inherited value written per frame would restyle the whole document.
        const areaStyle = writingArea.getAttribute('style');
        for (const time of [HELD_DURATION / 4, HELD_DURATION / 2, (HELD_DURATION * 3) / 4]) {
          opening.seek(time);
          await nextFrame();
          expect(writingArea.getAttribute('style')).toBe(areaStyle);
          expectBreakoutsFitWritingArea(fullImage.element(), wideImage.element());
        }
        const sidebar = editorScreen.settingsSidebar().element();
        const panel = sidebar.parentElement!;
        expect(panel.getBoundingClientRect().width).toBeGreaterThan(0);
        expect(panel.getBoundingClientRect().width).toBeLessThan(350);
        opening.finish();
        await expect.poll(() => panel.getBoundingClientRect().width).toBe(350);
        expectBreakoutsFitWritingArea(fullImage.element(), wideImage.element());
        expectPixelAdjustment(fullImage.element());

        await editorScreen.settingsToggle().click();
        const closing = await heldSettingsMotion(
          opening.transitions,
          SETTINGS_MOTION_PARTS + cardParts,
        );
        closing.seek(HELD_DURATION / 2);
        await nextFrame();
        expect(writingArea.getAttribute('style')).toBe(areaStyle);
        expectBreakoutsFitWritingArea(fullImage.element(), wideImage.element());
        closing.finish();
        await expect(editorScreen.settingsSidebar()).toHaveCount(0);
        expectBreakoutsFitWritingArea(fullImage.element(), wideImage.element());
        expectPixelAdjustment(fullImage.element());

        // Once the panel has arrived the cards follow a window resize at once.
        await editorScreen.settingsToggle().click();
        (await heldSettingsMotion(closing.transitions, SETTINGS_MOTION_PARTS + cardParts)).finish();
        await expect.poll(() => document.querySelector('[data-settings-moving]')).toBeNull();
        await page.viewport(1800, 1000);
        await expect.poll(() => window.innerWidth).toBe(1800);
        await nextFrame();
        expect(settingsTransitions()).toHaveLength(0);
        expectBreakoutsFitWritingArea(fullImage.element(), wideImage.element());
        expectPixelAdjustment(fullImage.element());
      } finally {
        animationStyle.remove();
      }
    } finally {
      URL.revokeObjectURL(full.src);
      URL.revokeObjectURL(wide.src);
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
      await expect.element(editorScreen.reauthDialog()).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect.element(editorScreen.saveErrorBanner()).toBeVisible();

      const banner = editorScreen.saveErrorBanner().element().getBoundingClientRect();
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
      expect(editorScreen.saveErrorBanner().element().getBoundingClientRect().top).toBe(banner.top);
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
