import { z } from 'zod';

import { iconField } from './icon.ts';
import { APP_ID_MAX_LENGTH, isValidAppId } from './id.ts';
import { publicKeyField } from './keys.ts';
import { isLocalhost } from './localhost.ts';
import { surfacesField } from './surfaces.ts';
import { plainText } from './text.ts';
import {
  absoluteUrl,
  FRAGMENT_PROBLEM,
  hasFragment,
  urlField,
  type UrlField,
  type UrlRules,
} from './url.ts';

const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 200;
const AUTHOR_NAME_MAX_LENGTH = 50;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const KEY_FIELDS: ReadonlySet<PropertyKey> = new Set(['identity_key', 'backend_key']);
const URL_FIELDS: ReadonlySet<PropertyKey> = new Set([
  'author',
  'icon',
  'surfaces',
  'manifest_url',
  'development',
]);

/** Passes a refinement only once the fields it reads parsed, and the manifest is an object. */
const parsedFields =
  (fields: ReadonlySet<PropertyKey>) =>
  ({ issues }: { issues: readonly { path?: readonly PropertyKey[] }[] }) =>
    issues.every(({ path = [] }) => path.length > 0 && !fields.has(path[0]!));

/**
 * The manifest as a whole. Unknown fields are rejected at every level, so an app cannot
 * claim something Ghost has not designed, and adding a field is always a deliberate change
 * here.
 *
 * Defined once, with the URL rule left open. What a valid URL is depends on whether the
 * manifest is being parsed, when where Ghost is served from matters, or read back after it
 * was, when it doesn't.
 */
function manifestShape(url: UrlField) {
  return (
    z
      .strictObject({
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
        // Where the signed manifest is served from: the app's one origin, which every path
        // in it resolves against. Ghost fetches it server-side and never loads it as a page.
        manifest_url: url(true).refine((address) => !hasFragment(address), FRAGMENT_PROBLEM),
        identity_key: publicKeyField,
        backend_key: publicKeyField,
        // Lets Admin label a development build. Production sites may run one to test it.
        development: z.boolean('Expected true or false'),
      })
      // A backend holds its key online. If it also signed manifests, whoever took over the
      // backend could publish any manifest as the app.
      .refine((manifest) => manifest.identity_key.x !== manifest.backend_key.x, {
        message: 'Expected a different key from identity_key',
        path: ['backend_key'],
        // Only once both keys are known to be keys. An issue without a path is about the
        // manifest as a whole, which may not be an object at all.
        when: parsedFields(KEY_FIELDS),
      })
      // An app on the developer's machine is always labelled as a development build.
      .refine(
        (manifest) =>
          manifest.development ||
          ![
            manifest.author.url,
            'url' in manifest.icon ? manifest.icon.url : undefined,
            ...manifest.surfaces.map((surface) => surface.url),
            manifest.manifest_url,
          ].some((address) => address !== undefined && isLocalhost(new URL(address).hostname)),
        {
          message: 'Expected true, as the app is on localhost',
          path: ['development'],
          when: parsedFields(URL_FIELDS),
        },
      )
  );
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
