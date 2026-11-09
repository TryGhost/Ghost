/**
 * The card runtime: how Admin and an app's card code talk while a card is rendered or
 * configured in the editor.
 *
 * Admin loads a card's bundle itself, unpinned, from the path the manifest names, and posts its
 * source with a `MessagePort` into a hidden sandbox with no origin of its own. Rendering runs in
 * a Worker with no network (`CardRenderExports`); the settings panel runs in the sandbox's
 * document and mirrors remote-dom elements to Admin (`CardSettingsExports`). Admin validates
 * everything that comes back with the schemas here.
 */
import { z } from 'zod';

import {
  CARD_BACKEND_BODY_MAX_BYTES,
  CARD_HEIGHT_MAX,
  CARD_HEIGHT_MIN,
  CARD_HTML_MAX_BYTES,
  CARD_IMAGE_MAX_BYTES,
  CARD_PROPERTIES_MAX_BYTES,
} from './types.ts';

export * from './types.ts';

const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;

const boundedText = (maxBytes: number) =>
  z
    .string('Expected text')
    .refine((value) => byteLength(value) <= maxBytes, `Expected at most ${maxBytes} bytes`);

const PROPERTY_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

/** What a render returns. Ghost sanitises the HTML itself; this only checks shape and size. */
export const CardRenderOutputSchema = z.strictObject({
  html: boundedText(CARD_HTML_MAX_BYTES).refine((value) => value.trim() !== '', 'Expected HTML'),
  css: boundedText(CARD_HTML_MAX_BYTES),
  height: z.number().int().min(CARD_HEIGHT_MIN).max(CARD_HEIGHT_MAX),
  email_html: boundedText(CARD_HTML_MAX_BYTES),
  public_properties: z.array(z.string().regex(PROPERTY_NAME)).max(100),
});

/** Properties a settings panel proposes: a plain JSON object, within the size limit. */
export const CardPatchSchema = z
  .record(z.string().regex(PROPERTY_NAME), z.json())
  .refine(
    (patch) => byteLength(JSON.stringify(patch)) <= CARD_PROPERTIES_MAX_BYTES,
    `Expected at most ${CARD_PROPERTIES_MAX_BYTES} bytes of properties`,
  );

export const CardBackendRequestSchema = z.strictObject({
  url: z.url('Expected an absolute URL'),
  method: z.enum(['GET', 'POST']),
  headers: z.record(z.string(), z.string()).optional(),
  body: boundedText(CARD_BACKEND_BODY_MAX_BYTES).optional(),
});

export const CardGeneratedImageSchema = z.strictObject({
  name: z.string().min(1).max(200),
  type: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  bytes: z
    .instanceof(Uint8Array)
    .refine((bytes) => bytes.byteLength <= CARD_IMAGE_MAX_BYTES, 'Expected a smaller image'),
});
