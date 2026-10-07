import { z } from 'zod';

import { urlField, type UrlRules } from './url.ts';

const ICON_NAME_MAX_LENGTH = 64;
const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The icon is drawn by Ghost on the app's accent colour: either one of the icons Admin
 * ships, by name, or an SVG the app serves. Ghost shows the SVG as an image and never
 * inlines it. A name Admin does not know is not an error here, since the set depends on
 * the Admin build; Admin falls back to a default icon.
 */
export function iconField(rules: UrlRules) {
  return z
    .strictObject(
      {
        name: z
          .string('Expected an icon name')
          .max(ICON_NAME_MAX_LENGTH, `Expected at most ${ICON_NAME_MAX_LENGTH} characters`)
          .regex(ICON_NAME, 'Expected an icon name such as audio-lines')
          .optional(),
        url: urlField(rules).optional(),
      },
      'Expected an icon with either a name or a url',
    )
    .transform(({ name, url }, ctx): { name: string } | { url: string } => {
      if (name !== undefined && url === undefined) {
        return { name };
      }
      if (url !== undefined && name === undefined) {
        return { url };
      }
      ctx.addIssue({ code: 'custom', message: 'Expected an icon with either a name or a url' });
      return z.NEVER;
    });
}
