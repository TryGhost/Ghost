import { z } from 'zod';

const tiersBoundarySchema = z.looseObject({
  tiers: z.array(
    z.looseObject({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      active: z.boolean(),
    }),
  ),
});

export type RecipientTier = z.infer<typeof tiersBoundarySchema>['tiers'][number];

/** The paid tiers a recipient filter can name; none when the response is missing or malformed. */
export function parseRecipientTiers(tiersData: unknown): RecipientTier[] {
  const tiers = tiersBoundarySchema.safeParse(tiersData);

  return tiers.success ? tiers.data.tiers : [];
}
