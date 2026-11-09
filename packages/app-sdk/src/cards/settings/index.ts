/**
 * A card's settings panel: the settings bundle.
 *
 * Ghost loads the bundle into a hidden sandbox with no origin of its own. The panel renders the
 * `ghost-card-*` elements into `document.body`, with any framework; Ghost mirrors them into the
 * editor and draws each with its own controls. The panel proposes new properties, and Ghost
 * renders the card and saves both together.
 *
 * ```ts
 * import { defineCardSettings } from '@tryghost/app-sdk/cards/settings';
 *
 * defineCardSettings({
 *   'big-number': (panel) => {
 *     const input = document.createElement('ghost-card-input');
 *     input.label = 'Number';
 *     input.value = String(panel.properties.number ?? '');
 *     input.addEventListener('change', (event) => panel.propose({ number: event.detail }));
 *     document.body.append(input);
 *   },
 * });
 * ```
 */
import { ThreadFunctionsManualMemoryManagement, ThreadMessagePort, retain } from '@quilted/threads';
import type { RemoteConnection } from '@remote-dom/core';
import type {
  CardGeneratedImage,
  CardProperties,
  CardSettingsExports,
  CardSettingsHost,
  CardSite,
} from '@tryghost/app-contracts/cards';

import { CARD_START_GLOBAL } from '../constants.ts';
import { registerCardSettingsElements } from './elements.ts';
import { CardMutationMirror } from './mutation-mirror.ts';

export {
  CardFileElement,
  CardInputElement,
  CardNoteElement,
  CardRowElement,
  CardSelectElement,
  CardTextareaElement,
  CardToggleElement,
  registerCardSettingsElements,
  type CardFile,
  type CardFileProperties,
  type CardInputProperties,
  type CardNoteProperties,
  type CardSelectOption,
  type CardSelectProperties,
  type CardToggleProperties,
} from './elements.ts';
export type { CardGeneratedImage, CardProperties, CardSite } from '@tryghost/app-contracts/cards';

/** What a settings panel gets. */
export interface CardSettingsPanel {
  readonly card: string;
  /** The card's properties as the editor has them now. */
  readonly properties: CardProperties;
  readonly site: CardSite;
  /** Proposes new values for some properties. Ghost renders the card and saves both together. */
  propose(patch: CardProperties): Promise<void>;
  /**
   * Calls one of the card's `backend_origins` at an absolute URL. Ghost makes the request without
   * its own credentials.
   */
  fetch(
    url: string,
    init?: { method?: 'GET' | 'POST'; headers?: Record<string, string>; body?: string },
  ): Promise<Response>;
  /** Stores an image on the site, such as a picture of the card for email, and returns its URL. */
  uploadImage(image: CardGeneratedImage): Promise<{ url: string }>;
  /** Called when the card's properties change in the editor, such as after an undo. */
  onPropertiesChange(listener: (properties: CardProperties) => void): () => void;
}

export type CardSettingsRenderer = (panel: CardSettingsPanel) => void | Promise<void>;

/**
 * Registers this bundle's settings panels, by card name. Call it once, when the bundle loads.
 * Ghost starts one panel per sandbox.
 */
export function defineCardSettings(panels: Record<string, CardSettingsRenderer>): void {
  registerCardSettingsElements();
  const scope = globalThis as unknown as Record<string, unknown>;
  scope[CARD_START_GLOBAL] = (port: MessagePort) => {
    let started = false;
    let properties: CardProperties = {};
    const listeners = new Set<(properties: CardProperties) => void>();

    const exports: CardSettingsExports = {
      async renderSettings(request, connection, host: CardSettingsHost) {
        if (started) {
          throw new Error('This sandbox already shows a settings panel');
        }
        started = true;
        const panel = Object.prototype.hasOwnProperty.call(panels, request.card)
          ? panels[request.card]
          : undefined;
        if (!panel) {
          throw new Error(`This bundle has no settings panel for the card ${request.card}`);
        }
        // Ghost keeps both for as long as the panel is open.
        retain(connection);
        retain(host);
        properties = structuredClone(request.properties);
        new CardMutationMirror(connection as RemoteConnection).observe(document.body);

        await panel({
          card: request.card,
          get properties() {
            return properties;
          },
          site: request.site,
          propose: (patch) => host.propose(structuredClone(patch)),
          async fetch(url, init = {}) {
            const response = await host.fetch({
              // The sandbox has no address of its own, so the URL must be absolute.
              url: new URL(url).href,
              method: init.method ?? 'GET',
              headers: init.headers,
              body: init.body,
            });
            // A Response for these statuses can't have a body, even an empty one.
            const noBody = [101, 103, 204, 205, 304].includes(response.status);
            return new Response(noBody ? null : response.body, {
              status: response.status,
              headers: response.headers,
            });
          },
          uploadImage: (image) => host.uploadImage(image),
          onPropertiesChange(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
        });
      },
      async propertiesChanged(next) {
        properties = structuredClone(next);
        for (const listener of listeners) {
          listener(properties);
        }
      },
    };

    new ThreadMessagePort<Record<string, never>, CardSettingsExports>(port, {
      exports,
      functions: new ThreadFunctionsManualMemoryManagement(),
    });
    port.start();
  };
}
