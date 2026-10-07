import { z } from 'zod';

const tiersBoundarySchema = z.looseObject({
  tiers: z.array(z.looseObject({ slug: z.string(), name: z.string(), active: z.boolean() })),
});
const labelsBoundarySchema = z.looseObject({
  labels: z.array(z.looseObject({ slug: z.string(), name: z.string() })),
});

/** Keeps either independently loaded segment collection when the other boundary fails. */
export function parseRecipientSegments(tiersData: unknown, labelsData: unknown) {
  const tiers = tiersBoundarySchema.safeParse(tiersData);
  const labels = labelsBoundarySchema.safeParse(labelsData);

  return {
    tiers: tiers.success ? tiers.data.tiers : [],
    labels: labels.success ? labels.data.labels : [],
  };
}
