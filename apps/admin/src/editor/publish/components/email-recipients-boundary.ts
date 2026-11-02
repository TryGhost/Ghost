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

const labelOptionBoundarySchema = z.looseObject({ value: z.string(), label: z.string() });

export type RecipientLabelOption = z.infer<typeof labelOptionBoundarySchema>;

/**
 * The labels the shared label source offers, each a slug and a name. An entry
 * that is not that is dropped rather than reaching the picker, which would
 * fail on it; the rest are kept.
 */
export function parseRecipientLabelOptions(options: unknown): RecipientLabelOption[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.flatMap((option) => {
    const parsed = labelOptionBoundarySchema.safeParse(option);

    return parsed.success ? [parsed.data] : [];
  });
}
