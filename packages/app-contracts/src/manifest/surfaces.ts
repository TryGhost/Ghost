import { z } from 'zod';

import type { UrlField } from './url.ts';

/**
 * What an app asks for: the places in Ghost it wants to appear. Each surface type is one
 * entry in a union, so a new one is added here and nowhere else.
 */
export function surfacesField(url: UrlField) {
  const adminPage = z.strictObject({
    type: z.literal('admin_page'),
    url: url(),
  });

  const surfaceTypes = [adminPage] as const;

  const surface = z.discriminatedUnion('type', surfaceTypes, {
    error: `Expected a surface with a type of: ${surfaceTypes.map((entry) => entry.shape.type.value).join(', ')}`,
  });

  return z
    .array(surface, 'Expected a list of surfaces')
    .min(1, 'Expected at least one surface')
    .superRefine((surfaces, ctx) => {
      const seen = new Set<string>();
      surfaces.forEach((entry, index) => {
        if (seen.has(entry.type)) {
          ctx.addIssue({
            code: 'custom',
            message: `Expected at most one ${entry.type} surface`,
            path: [index],
          });
        }
        seen.add(entry.type);
      });
    });
}
