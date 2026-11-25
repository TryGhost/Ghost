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

export function parseRecipientTiers(tiersData: unknown): RecipientTier[] {
  const tiers = tiersBoundarySchema.safeParse(tiersData);

  return tiers.success ? tiers.data.tiers : [];
}

const labelOptionBoundarySchema = z.looseObject({ value: z.string(), label: z.string() });

export type RecipientLabelOption = z.infer<typeof labelOptionBoundarySchema>;

/** A malformed label is dropped on its own, so one bad entry doesn't hide the rest. */
export function parseRecipientLabelOptions(options: unknown): RecipientLabelOption[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.flatMap((option) => {
    const parsed = labelOptionBoundarySchema.safeParse(option);

    return parsed.success ? [parsed.data] : [];
  });
}
