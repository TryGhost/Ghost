/**
 * Rendering an app's editor cards: the render bundle.
 *
 * Ghost loads the bundle into a Worker with no network and no DOM, and asks it to turn a card's
 * properties into the HTML it saves in the post. One bundle may render several cards.
 *
 * ```ts
 * import { defineCardRenderers } from '@tryghost/app-sdk/cards';
 *
 * defineCardRenderers({
 *   'big-number': ({ properties }) => ({ html: `<p>${escape(properties.number)}</p>` }),
 * });
 * ```
 *
 * The settings panel is a separate bundle, built from `@tryghost/app-sdk/cards/settings`.
 */
import { ThreadMessagePort } from '@quilted/threads';
import type {
  CardRenderExports,
  CardRenderOutput,
  CardRenderRequest,
} from '@tryghost/app-contracts/cards';

import { CARD_HEIGHT_MAX, CARD_HEIGHT_MIN, CARD_START_GLOBAL } from './constants.ts';

export type {
  CardProperties,
  CardRenderOutput,
  CardRenderRequest,
  CardSite,
} from '@tryghost/app-contracts/cards';

/** What a card's renderer returns. Anything left out takes its default. */
export interface CardRendererResult {
  /** The card on the web: static HTML, with no scripts, frames or event handlers. */
  html: string;
  css?: string;
  /** The height to reserve on the site before the card's frame reports its own. 320 by default. */
  height?: number;
  /** The card in email and RSS. Leave it out for a link to the post instead. */
  email_html?: string;
  /** The properties a live frame on the site may read. None unless listed. */
  public_properties?: string[];
}

export type CardRenderer = (
  request: CardRenderRequest,
) => CardRendererResult | Promise<CardRendererResult>;

function normalise(result: CardRendererResult): CardRenderOutput {
  if (!result || typeof result.html !== 'string' || result.html.trim() === '') {
    throw new Error('A card renderer must return { html } with the card’s web output');
  }
  const height = Number.isFinite(result.height) ? Math.round(result.height!) : 320;
  return {
    html: result.html,
    css: typeof result.css === 'string' ? result.css : '',
    height: Math.min(CARD_HEIGHT_MAX, Math.max(CARD_HEIGHT_MIN, height)),
    email_html: typeof result.email_html === 'string' ? result.email_html : '',
    public_properties: Array.isArray(result.public_properties) ? [...result.public_properties] : [],
  };
}

/**
 * Registers this bundle's renderers, by card name. Call it once, when the bundle loads; Ghost
 * starts the bundle on a channel of its own once it has run.
 */
export function defineCardRenderers(renderers: Record<string, CardRenderer>): void {
  const scope = globalThis as unknown as Record<string, unknown>;
  scope[CARD_START_GLOBAL] = (port: MessagePort) => {
    const exports: CardRenderExports = {
      async render(request) {
        const renderer = Object.prototype.hasOwnProperty.call(renderers, request.card)
          ? renderers[request.card]
          : undefined;
        if (!renderer) {
          throw new Error(`This bundle has no renderer for the card ${request.card}`);
        }
        return normalise(await renderer(request));
      },
    };
    new ThreadMessagePort<Record<string, never>, CardRenderExports>(port, { exports });
    port.start();
  };
}
