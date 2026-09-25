import { z } from 'zod';

// providers send dimensions as numbers, numeric strings, "100%", or null
const Dimension = z.union([z.number(), z.string()]).nullish();

// Loose on purpose: providers omit spec fields and card consumers read extra ones
export const OembedData = z.looseObject({
  type: z.string().optional(),
  version: z.union([z.string(), z.number()]).nullish(),
  title: z.string().nullish(),
  html: z.string().nullish(),
  url: z.string().nullish(),
  width: Dimension,
  height: Dimension,
  author_name: z.string().nullish(),
  author_url: z.string().nullish(),
  provider_name: z.string().nullish(),
  provider_url: z.string().nullish(),
  thumbnail_url: z.string().nullish(),
  thumbnail_width: Dimension,
  thumbnail_height: Dimension,
});
export type OembedData = z.infer<typeof OembedData>;
