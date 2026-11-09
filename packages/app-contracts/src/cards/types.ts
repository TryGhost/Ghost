// The card runtime's types and constants, with no dependencies, so the SDK can use them without
// zod. The schemas in `index.ts` check what crosses from the sandbox at runtime.

/** Posted by Admin to a card sandbox's shim, with the card's bundle and the channel's port. */
export const CARD_INIT_MESSAGE_TYPE = 'ghost-card:init';

/** Posted by a static sandbox's shim once its Worker has started the bundle. */
export const CARD_READY_MESSAGE_TYPE = 'ghost-card:ready';

/** Posted by a static sandbox's shim when its Worker failed to start the bundle. */
export const CARD_FAILED_MESSAGE_TYPE = 'ghost-card:failed';

/** The global a card bundle sets, once evaluated, to the function that starts it on a port. */
export const CARD_START_GLOBAL = '__ghostCardStart';

/** How long a sandbox has to start, and a render or settings panel to answer, in milliseconds. */
export const CARD_TIMEOUT_MS = 10_000;

export const CARD_HTML_MAX_BYTES = 1_000_000;
export const CARD_PROPERTIES_MAX_BYTES = 1_000_000;
export const CARD_HEIGHT_MIN = 20;
export const CARD_HEIGHT_MAX = 4000;
export const CARD_BACKEND_BODY_MAX_BYTES = 1_000_000;
export const CARD_IMAGE_MAX_BYTES = 5_000_000;
export const CARD_FILE_MAX_BYTES = 1_000_000;

/** What a card's render and settings code know about the site. */
export interface CardSite {
  url: string;
  title: string;
  locale: string;
  timezone: string;
}

export type CardProperties = Record<string, unknown>;

export interface CardRenderRequest {
  /** The card's name in the manifest, as one bundle may serve several cards. */
  card: string;
  properties: CardProperties;
  site: CardSite;
}

/**
 * What one render produces from a card's properties. Ghost saves it in the post with the
 * properties, so the card shows without the app.
 */
export interface CardRenderOutput {
  /** The card on the web: static HTML, with no scripts, frames or event handlers. */
  html: string;
  css: string;
  /** The height to reserve before the card's frame reports its own, in CSS pixels. */
  height: number;
  /** The card in email and RSS. Empty for a link to the post instead. */
  email_html: string;
  /** The properties a live frame on the site may read. None unless listed. */
  public_properties: string[];
}

/** What a static sandbox exposes: rendering, and nothing else. */
export interface CardRenderExports {
  render(request: CardRenderRequest): Promise<CardRenderOutput>;
}

/** A request from a settings panel to the app's backend, which Admin makes for it. */
export interface CardBackendRequest {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export interface CardBackendResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** An image the settings panel made, such as a chart's picture for email, for Ghost to store. */
export interface CardGeneratedImage {
  name: string;
  type: 'image/png' | 'image/jpeg' | 'image/webp';
  bytes: Uint8Array;
}

/** What Admin offers a card's settings panel. */
export interface CardSettingsHost {
  /** Proposes new values for some properties. Ghost renders the card and saves both together. */
  propose(patch: CardProperties): Promise<void>;
  /** Calls one of the card's `backend_origins`, without Ghost's credentials. */
  fetch(request: CardBackendRequest): Promise<CardBackendResponse>;
  /** Stores an image on the site, and returns where Ghost serves it. */
  uploadImage(image: CardGeneratedImage): Promise<{ url: string }>;
}

export interface CardSettingsRequest {
  card: string;
  properties: CardProperties;
  site: CardSite;
}

/**
 * What an interactive sandbox exposes. `connection` is remote-dom's, which the panel's
 * elements are mirrored over; it and `host` are functions that cross the channel.
 */
export interface CardSettingsExports {
  renderSettings(
    request: CardSettingsRequest,
    connection: unknown,
    host: CardSettingsHost,
  ): Promise<void>;
  /** The card's properties changed in the editor, such as after an undo. */
  propertiesChanged(properties: CardProperties): Promise<void>;
}

/** The tags of the elements a settings panel may use, which Koenig draws with its controls. */
export const CARD_SETTINGS_ELEMENTS = [
  'ghost-card-input',
  'ghost-card-textarea',
  'ghost-card-select',
  'ghost-card-toggle',
  'ghost-card-file',
  'ghost-card-row',
  'ghost-card-note',
] as const;

export type CardSettingsElement = (typeof CARD_SETTINGS_ELEMENTS)[number];
