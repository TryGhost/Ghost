import { z } from 'zod';

const revisionSchema = z.object({
  id: z.string().optional(),
  lexical: z.string().nullish(),
  title: z.string().nullish(),
  custom_excerpt: z.string().nullish(),
  feature_image: z.string().nullish(),
  feature_image_alt: z.string().nullish(),
  feature_image_caption: z.string().nullish(),
  post_status: z.string().nullish(),
  reason: z.string().nullish(),
  created_at: z.string().optional(),
  author: z.object({ name: z.string().nullish(), profile_image: z.string().nullish() }).nullish(),
});
const revisionsSchema = z.array(revisionSchema);

/** Validate optional API history before either the editor or its preview reads it. */
export function parsePostRevisions(value: unknown) {
  const parsed = revisionsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function revisionTime(revision: z.infer<typeof revisionSchema>): number {
  const time = Date.parse(revision.created_at ?? '');
  return Number.isNaN(time) ? 0 : time;
}
