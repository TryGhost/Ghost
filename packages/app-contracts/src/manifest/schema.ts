import { z } from 'zod';

import { iconField } from './icon.ts';
import { APP_ID_MAX_LENGTH, isValidAppId } from './id.ts';
import { surfacesField } from './surfaces.ts';
import { plainText } from './text.ts';
import { urlField, type UrlRules } from './url.ts';

const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 200;
const AUTHOR_NAME_MAX_LENGTH = 50;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * The manifest as a whole. Unknown fields are rejected at every level, so an app cannot
 * claim something Ghost has not designed, and adding a field is always a deliberate change
 * here.
 *
 * It is built per parse because what a valid URL is depends on where the manifest was
 * fetched from and where Ghost is served from.
 */
export function manifestSchema(rules: UrlRules) {
  return z.strictObject({
    id: z.custom<string>(isValidAppId, {
      error: `Expected a lowercase reverse-domain ID such as com.example.app, at most ${APP_ID_MAX_LENGTH} characters`,
    }),
    name: plainText(NAME_MAX_LENGTH),
    description: plainText(DESCRIPTION_MAX_LENGTH),
    author: z.strictObject(
      {
        name: plainText(AUTHOR_NAME_MAX_LENGTH),
        // Only ever linked to, so it may point at the publisher's own site.
        url: urlField(rules, true),
      },
      'Expected an author with a name and a url',
    ),
    accent_color: z
      .string('Expected a hex colour such as #ff5500')
      .regex(HEX_COLOR, 'Expected a hex colour such as #ff5500')
      .toLowerCase(),
    icon: iconField(rules),
    surfaces: surfacesField(rules),
  });
}

/**
 * A parsed manifest. Every URL in it is absolute, and a surface's origin is the only one
 * allowed to talk to Ghost from that surface.
 */
export type AppManifest = z.output<ReturnType<typeof manifestSchema>>;

export type AppSurface = AppManifest['surfaces'][number];

export type AppSurfaceType = AppSurface['type'];
