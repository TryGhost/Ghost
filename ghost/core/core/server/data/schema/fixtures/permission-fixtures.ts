import { z } from 'zod';
import { definitions } from '../../../services/permissions/definitions';

const fixturesSchema = z
  .object({
    models: z.array(
      z.object({ name: z.string(), entries: z.array(z.unknown()).optional() }).passthrough(),
    ),
    relations: z.array(
      z
        .object({
          from: z.object({ model: z.string() }).passthrough(),
          to: z.object({ model: z.string() }).passthrough(),
          entries: z.unknown().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

// Populate the permission placeholders without initializing the authorization service.
// Fresh copies keep fixture processing and migrations from mutating the static definitions.
export function withPermissionFixtures(input: unknown) {
  const fixtures = fixturesSchema.parse(input);
  return {
    ...fixtures,
    models: fixtures.models.map((model) =>
      model.name === 'Permission'
        ? { ...model, entries: structuredClone(definitions.permissions) }
        : model,
    ),
    relations: fixtures.relations.map((relation) =>
      relation.from.model === 'Role' && relation.to.model === 'Permission'
        ? {
            ...relation,
            entries: structuredClone(
              Object.fromEntries(
                Object.entries(definitions.grants).filter(
                  ([, objects]) => Object.keys(objects).length,
                ),
              ),
            ),
          }
        : relation,
    ),
  };
}
