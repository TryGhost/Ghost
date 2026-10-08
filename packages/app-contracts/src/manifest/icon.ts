import { z } from 'zod';

import type { UrlField } from './url.ts';

const ICON_NAME_MAX_LENGTH = 64;
const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EITHER = 'Expected an icon with either a name or a url';

/** One of the icons Admin ships, by name, or an SVG the app serves. */
export type AppIcon = { name: string } | { url: string };

/**
 * The icon is drawn by Ghost on the app's accent colour: either one of the icons Admin
 * ships, by name, or an SVG the app serves. Ghost shows the SVG as an image and never
 * inlines it. A name Admin does not know is not an error here, since the set depends on
 * the Admin build; Admin falls back to a default icon.
 */
export function iconField(url: UrlField) {
  return (
    z
      .strictObject(
        {
          name: z
            .string('Expected an icon name')
            .max(ICON_NAME_MAX_LENGTH, `Expected at most ${ICON_NAME_MAX_LENGTH} characters`)
            .regex(ICON_NAME, 'Expected an icon name such as audio-lines')
            .optional(),
          url: url().optional(),
        },
        EITHER,
      )
      .refine(({ name, url: iconUrl }) => (name === undefined) !== (iconUrl === undefined), EITHER)
      // Only the type narrows: the value already is one or the other. A transform would
      // narrow it too, but one-way, and a stored manifest has to encode back through here.
      .pipe(z.custom<AppIcon>())
  );
}
