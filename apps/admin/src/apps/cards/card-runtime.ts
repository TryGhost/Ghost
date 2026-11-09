import {
  ThreadFunctionsManualMemoryManagement,
  ThreadMessagePort,
  release,
  retain,
} from '@quilted/threads';
import { RemoteReceiver } from '@remote-dom/core/receivers';
import {
  CARD_BACKEND_BODY_MAX_BYTES,
  CARD_TIMEOUT_MS,
  CardBackendRequestSchema,
  CardGeneratedImageSchema,
  CardPatchSchema,
  CardRenderOutputSchema,
  type CardBackendResponse,
  type CardProperties,
  type CardRenderExports,
  type CardRenderOutput,
  type CardSettingsExports,
  type CardSettingsHost,
  type CardSite,
} from '@tryghost/app-contracts/cards';
import type { CardSurface } from '@tryghost/app-contracts';
import { startCardSandbox, withTimeout } from './card-sandbox';
import type { AppCardSettingsSession, OpenAppCardSettingsOptions } from './types';

/**
 * Reads a card's bundle as text, unpinned, from the app's origin. No cookies or referrer go with
 * it, and a redirect elsewhere is refused.
 */
export async function fetchCardBundle(url: string): Promise<string> {
  // The app's own server, not Ghost: its code is read as text, without Ghost's credentials.
  // eslint-disable-next-line no-restricted-syntax
  const response = await fetch(url, {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
    cache: 'no-cache',
  });
  if (!response.ok) {
    throw new Error(`Couldn’t load the card’s code (${response.status})`);
  }
  return response.text();
}

/**
 * Renders a card in a fresh static sandbox, with no network and no DOM, and checks what comes
 * back. One sandbox per render (no pooling until a measured problem says otherwise).
 */
export async function renderCard(
  source: string,
  request: { card: string; properties: CardProperties; site: CardSite },
): Promise<CardRenderOutput> {
  const sandbox = await startCardSandbox(source, 'static');
  try {
    const thread = new ThreadMessagePort<CardRenderExports>(sandbox.port);
    const output = await withTimeout(
      thread.imports.render(structuredClone(request)),
      CARD_TIMEOUT_MS,
      'The card took too long to render',
    );
    return CardRenderOutputSchema.parse(output);
  } finally {
    sandbox.dispose();
  }
}

const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;

/**
 * What Admin offers a card's settings panel. Every argument comes from the sandbox, so each is
 * checked before Admin acts on it.
 */
export function createSettingsHost(
  surface: Pick<CardSurface, 'backend_origins'>,
  options: Pick<OpenAppCardSettingsOptions, 'propose' | 'uploadImage'>,
): CardSettingsHost {
  const backendOrigins = new Set(
    (surface.backend_origins ?? []).map((origin) => new URL(origin).origin),
  );
  return {
    async propose(patch: unknown) {
      await options.propose(structuredClone(CardPatchSchema.parse(patch)));
    },
    async fetch(request: unknown): Promise<CardBackendResponse> {
      const { url, method, headers, body } = CardBackendRequestSchema.parse(request);
      const target = new URL(url);
      if (!backendOrigins.has(target.origin)) {
        throw new Error(`The card may only call its declared backend, not ${target.origin}`);
      }
      const response = await withTimeout(
        // The card's declared backend, never Ghost, and without Ghost's credentials.
        // eslint-disable-next-line no-restricted-syntax
        fetch(target, {
          method,
          headers,
          body: method === 'GET' ? undefined : body,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          redirect: 'error',
        }),
        CARD_TIMEOUT_MS,
        'The card’s backend took too long to answer',
      );
      const text = await response.text();
      if (byteLength(text) > CARD_BACKEND_BODY_MAX_BYTES) {
        throw new Error('The card’s backend answered with too much data');
      }
      // Only what a card needs to read the body; the rest of the backend's headers stay here.
      const contentType = response.headers.get('content-type');
      return {
        status: response.status,
        headers: contentType ? { 'content-type': contentType } : {},
        body: text,
      };
    },
    async uploadImage(image: unknown) {
      const { name, type, bytes } = CardGeneratedImageSchema.parse(image);
      const file = new File([bytes.slice()], name, { type });
      const { url } = await options.uploadImage(file);
      return { url };
    },
  };
}

/**
 * Starts a card's settings panel in an interactive sandbox. The panel's code renders remote-dom
 * elements in the sandbox's document, which are mirrored to `receiver` for Koenig to draw.
 */
export async function openCardSettings(
  source: string,
  surface: Pick<CardSurface, 'backend_origins'>,
  request: { card: string; properties: CardProperties; site: CardSite },
  options: Pick<OpenAppCardSettingsOptions, 'propose' | 'uploadImage'>,
): Promise<AppCardSettingsSession> {
  const sandbox = await startCardSandbox(source, 'interactive');
  try {
    const receiver = new RemoteReceiver({ retain, release });
    const thread = new ThreadMessagePort<CardSettingsExports>(sandbox.port, {
      functions: new ThreadFunctionsManualMemoryManagement(),
    });
    const host = createSettingsHost(surface, options);
    await withTimeout(
      thread.imports.renderSettings(structuredClone(request), receiver.connection, host),
      CARD_TIMEOUT_MS,
      'The card’s settings took too long to open',
    );
    return {
      receiver,
      propertiesChanged(properties) {
        thread.imports.propertiesChanged(structuredClone(properties)).catch(() => {});
      },
      dispose() {
        thread.close();
        sandbox.dispose();
      },
    };
  } catch (error) {
    sandbox.dispose();
    throw error;
  }
}
