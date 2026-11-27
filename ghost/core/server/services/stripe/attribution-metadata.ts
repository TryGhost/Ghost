/**
 * Where a buyer came from, as Ghost writes it into the metadata of the Checkout sessions it
 * creates and of the subscriptions they start: the page they bought from, the referrer that
 * brought them there, and the UTM parameters of the link they followed. The webhook reads it from
 * a checkout, and the Stripe client from a subscription, both with this schema and
 * `attributionOf`, and each caller maps the names it needs from there.
 */
import { z } from 'zod';

/** The metadata keys Ghost writes for where a buyer came from, leaving out each it doesn't know. */
export const AttributionMetadata = z
  .object({
    attribution_id: z.string().optional(),
    attribution_url: z.string().optional(),
    attribution_type: z.string().optional(),
    referrer_source: z.string().optional(),
    referrer_medium: z.string().optional(),
    referrer_url: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
  })
  .loose();

export type AttributionMetadata = z.output<typeof AttributionMetadata>;

/** Where a buyer came from, with null for each part Ghost doesn't know. */
export interface Attribution {
  attributionId: string | null;
  attributionUrl: string | null;
  attributionType: string | null;
  referrerSource: string | null;
  referrerMedium: string | null;
  referrerUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

/** Where a buyer came from, from the metadata Ghost wrote. */
export function attributionOf(metadata: AttributionMetadata): Attribution {
  return {
    attributionId: metadata.attribution_id ?? null,
    attributionUrl: metadata.attribution_url ?? null,
    attributionType: metadata.attribution_type ?? null,
    referrerSource: metadata.referrer_source ?? null,
    referrerMedium: metadata.referrer_medium ?? null,
    referrerUrl: metadata.referrer_url ?? null,
    utmSource: metadata.utm_source ?? null,
    utmMedium: metadata.utm_medium ?? null,
    utmCampaign: metadata.utm_campaign ?? null,
    utmTerm: metadata.utm_term ?? null,
    utmContent: metadata.utm_content ?? null,
  };
}
