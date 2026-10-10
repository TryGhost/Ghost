import { z } from 'zod';

import { iconField } from './icon.ts';
import { APP_ID_MAX_LENGTH, isValidAppId } from './id.ts';
import { surfacesField } from './surfaces.ts';
import { plainText } from './text.ts';
import { absoluteUrl, urlField, type UrlField, type UrlRules } from './url.ts';

const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 200;
const AUTHOR_NAME_MAX_LENGTH = 50;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * The manifest as a whole. Unknown fields are rejected at every level, so an app cannot
 * claim something Ghost has not designed, and adding a field is always a deliberate change
 * here.
 *
 * Defined once, with the URL rule left open. What a valid URL is depends on whether the
 * manifest is being parsed, when where it was fetched from and where Ghost is served from
 * both matter, or read back after it was, when neither does.
 */
function manifestShape(url: UrlField) {
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
        url: url(true),
      },
      'Expected an author with a name and a url',
    ),
    accent_color: z
      .string('Expected a hex colour such as #ff5500')
      .regex(HEX_COLOR, 'Expected a hex colour such as #ff5500')
      .toLowerCase(),
    icon: iconField(url),
    surfaces: surfacesField(url),
  });
}

/** The manifest as an app serves it. Built per parse, as its URL rule depends on the parse. */
export function manifestSchema(rules: UrlRules) {
  return manifestShape((linkOnly) => urlField(rules, linkOnly));
}

/**
 * The manifest as `parseManifest` hands it back: every URL absolute, and nothing left to
 * resolve or check. This is the schema to read a stored manifest with, as it holds
 * whatever the site's URL has become since, and it encodes a manifest back to the same
 * shape, so what is stored is what will be read.
 */
export const AppManifestSchema = manifestShape(absoluteUrl);

/**
 * A parsed manifest. Every URL in it is absolute, and a surface's origin is the only one
 * allowed to talk to Ghost from that surface.
 */
export type AppManifest = z.output<typeof AppManifestSchema>;

export type AppSurface = AppManifest['surfaces'][number];

export type AppSurfaceType = AppSurface['type'];
