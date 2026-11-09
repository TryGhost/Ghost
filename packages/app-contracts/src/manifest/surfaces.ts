import { z } from 'zod';

import { plainText } from './text.ts';
import type { UrlField } from './url.ts';

const CARD_NAME = /^[a-z][a-z0-9-]{0,62}$/;
const CARD_LABEL_MAX_LENGTH = 50;
const CARD_KEYWORDS_MAX = 10;
const CARD_KEYWORD_MAX_LENGTH = 30;
const CARD_ORIGINS_MAX = 10;
const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The browser features a card's live frame may ask for. Nothing is granted by default. */
export const CARD_FRAME_PERMISSIONS = ['fullscreen', 'autoplay', 'encrypted-media'] as const;

/**
 * A list of origins, such as `https://images.example.com`. Each is held to the manifest's URL
 * rules, and must be an origin alone: no path, query or fragment.
 */
function originList(url: UrlField) {
  const origin = url(true).refine((value) => {
    const parsed = URL.parse(value);
    // A literal host: `https://*` parses, but would allow every host as a CSP source.
    return (
      parsed !== null &&
      parsed.origin === value.replace(/\/$/, '') &&
      /^(?:[a-z0-9-]+\.)*[a-z0-9-]+$|^\[[0-9a-f:.]+\]$/i.test(parsed.hostname)
    );
  }, 'Expected an origin such as https://images.example.com, with no path or wildcard');
  return z
    .array(origin, 'Expected a list of origins')
    .max(CARD_ORIGINS_MAX, `Expected at most ${CARD_ORIGINS_MAX} origins`)
    .optional();
}

/**
 * What an app asks for: the places in Ghost it wants to appear. Each surface type is one
 * entry in a union, so a new one is added here and nowhere else.
 */
export function surfacesField(url: UrlField) {
  const adminPage = z.strictObject({
    type: z.literal('admin_page'),
    url: url(),
  });

  /**
   * A card the app adds to the editor. `name` identifies it in saved posts, so renaming a card
   * makes a new one. `render` and `settings` are the app's editor bundles, which Ghost loads as
   * they are into sandboxes with no origin of their own; one bundle may serve several cards.
   * `frame` is the page a published card goes live in, on the app's own origin.
   */
  const card = z.strictObject({
    type: z.literal('card'),
    name: z
      .string('Expected a card name')
      .regex(CARD_NAME, 'Expected a lowercase card name such as before-after'),
    label: plainText(CARD_LABEL_MAX_LENGTH),
    icon: z
      .string('Expected an icon name')
      .regex(ICON_NAME, 'Expected an icon name such as chart-column')
      .max(64)
      .optional(),
    keywords: z
      .array(plainText(CARD_KEYWORD_MAX_LENGTH))
      .max(CARD_KEYWORDS_MAX, `Expected at most ${CARD_KEYWORDS_MAX} keywords`)
      .optional(),
    render: url(),
    settings: url().optional(),
    frame: url().optional(),
    backend_origins: originList(url),
    image_origins: originList(url),
    media_origins: originList(url),
    frame_permissions: z.array(z.enum(CARD_FRAME_PERMISSIONS)).optional(),
  });

  const surfaceTypes = [adminPage, card] as const;

  const surface = z.discriminatedUnion('type', surfaceTypes, {
    error: `Expected a surface with a type of: ${surfaceTypes.map((entry) => entry.shape.type.value).join(', ')}`,
  });

  return z
    .array(surface, 'Expected a list of surfaces')
    .min(1, 'Expected at least one surface')
    .superRefine((surfaces, ctx) => {
      const seen = new Set<string>();
      surfaces.forEach((entry, index) => {
        // Cards come in multiples, each with its own name. Every other surface comes once.
        const key = entry.type === 'card' ? `card:${entry.name}` : entry.type;
        if (seen.has(key)) {
          ctx.addIssue({
            code: 'custom',
            message:
              entry.type === 'card'
                ? `Expected one card named ${entry.name}`
                : `Expected at most one ${entry.type} surface`,
            path: [index],
          });
        }
        seen.add(key);
      });
    });
}
