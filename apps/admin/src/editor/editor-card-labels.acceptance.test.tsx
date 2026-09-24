import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { SessionExpiredError } from '@tryghost/admin-x-framework/errors';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeLabels,
  label,
  renderAdminApp,
  staffRole,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const CURRENT_USER_ID = '1';
const FLAG_ON = { labs: { editorReact: true } };

const SIGNUP_CARD_LEXICAL = JSON.stringify({
  root: {
    children: [
      {
        type: 'signup',
        version: 1,
        alignment: 'left',
        backgroundColor: '#F0F0F0',
        backgroundImageSrc: '',
        backgroundSize: 'cover',
        buttonColor: '#000000',
        buttonText: 'Subscribe',
        buttonTextColor: '#FFFFFF',
        disclaimer: '',
        header: '<span>Join us</span>',
        labels: [],
        layout: 'wide',
        subheader: '',
        textColor: '#000000',
        swapped: false,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
});

// One more label than Core serves in a single page, so the last one is on page two.
const SITE_LABELS = [
  ...Array.from({ length: 100 }, (_, index) =>
    label({ name: `Label ${String(index + 1).padStart(3, '0')}` }),
  ),
  label({ name: 'Zebra supporters' }),
];

function bootAs(role: 'Contributor'): RenderAdminAppOptions {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: role })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function openSignupPost() {
  fakeEditorChrome();
  fakeEditorPost({
    id: POST_ID,
    lexical: SIGNUP_CARD_LEXICAL,
    authors: [{ id: CURRENT_USER_ID }],
  });
  return fakeLabels(SITE_LABELS);
}

// Koenig's labels dropdown reads `event.target` of an undefined event on its first focus.
function isKoenigFocusError(event: ErrorEvent) {
  const topFrame = event.error instanceof Error ? event.error.stack?.split('\n')[1] : undefined;
  return (
    event.message.includes("reading 'target'") && Boolean(topFrame?.includes('/koenig-lexical/'))
  );
}

async function focusLabelsInput() {
  const otherErrors: unknown[] = [];
  const tolerateKoenigFocusError = (event: ErrorEvent) => {
    if (!isKoenigFocusError(event)) {
      otherErrors.push(event.error);
    }
  };

  window.addEventListener('error', tolerateKoenigFocusError);
  try {
    await editorScreen.signupLabelsInput().click();
  } finally {
    window.removeEventListener('error', tolerateKoenigFocusError);
  }
  expect(otherErrors).toEqual([]);
}

describe('Signup card labels', () => {
  it('offers every site label, past the first page, as the writer types', async () => {
    const labelsApi = openSignupPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.poll(() => labelsApi.requests.map(({ page }) => page)).toEqual([1, 2]);
    expect(labelsApi.requests.map(({ limit }) => limit)).toEqual([100, 100]);
    expect(labelsApi.lastRequest?.url).toContain('fields=id%2Cname');

    const card = editorScreen.signupCard();
    // The first click selects the card, the second opens its settings.
    await card.click({ position: { x: 4, y: 4 } });
    await card.click({ position: { x: 4, y: 4 } });
    await focusLabelsInput();
    await userEvent.keyboard('Ze');

    await expect.element(editorScreen.signupLabelOption('Zebra supporters')).toBeVisible();
    await expect.element(editorScreen.signupLabelOption('Label 001')).not.toBeInTheDocument();
    // Koenig filters the list it already holds; typing asks the API for nothing.
    expect(labelsApi.requests).toHaveLength(2);
  });

  it('stays in the editor when a later labels page finds no session', async () => {
    const labelsApi = openSignupPost();
    const secondPageApi = fakeAdminEndpoint(
      'GET',
      /^\/labels\/\?(?=.*\bpage=2\b)/,
      { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
      { status: 401 },
    );
    // Koenig's Signup card does not catch a failed labels fetch.
    const rejections: unknown[] = [];
    const collectRejection = (event: PromiseRejectionEvent) => {
      rejections.push(event.reason);
    };
    // The session-expiry redirect replaces the document; record it instead of leaving.
    const documentLeaves: string[] = [];
    const recordDocumentLeave = (event: NavigateEvent) => {
      if (event.destination.url.split('#')[0] !== window.location.href.split('#')[0]) {
        documentLeaves.push(event.destination.url);
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', collectRejection);
    navigation.addEventListener('navigate', recordDocumentLeave);
    try {
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.poll(() => rejections.length).toBeGreaterThan(0);
      await expect.element(editorScreen.signupCard()).toBeVisible();
    } finally {
      window.removeEventListener('unhandledrejection', collectRejection);
      navigation.removeEventListener('navigate', recordDocumentLeave);
    }

    expect(documentLeaves).toEqual([]);
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    expect(secondPageApi.requests.length).toBeGreaterThan(0);
    expect(labelsApi.requests.every(({ page }) => page === 1)).toBe(true);
    expect(rejections.every((reason) => reason instanceof SessionExpiredError)).toBe(true);
  });

  it('asks a Contributor for no labels', async () => {
    const labelsApi = openSignupPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, bootAs('Contributor'));

    await expect.element(editorScreen.signupCard()).toBeVisible();
    expect(labelsApi.requests).toHaveLength(0);
  });
});
