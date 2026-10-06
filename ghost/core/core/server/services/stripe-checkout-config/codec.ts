import { z } from 'zod';
import { STRIPE_PORT, STRIPE_PORTS, type StripePort } from '@tryghost/checkout';
import type { StripeCheckoutConfig } from './models';
import { DbCheckoutConfigTier, type CheckoutSection } from './schema';

/** A column holding JSON, read and written as the shape it holds. */
function jsonColumn<T extends z.ZodType>(shape: T) {
  return z.codec(z.string(), shape, {
    decode: (text, ctx) => {
      try {
        return JSON.parse(text);
      } catch (err) {
        ctx.issues.push({
          code: 'invalid_format',
          format: 'json',
          input: text,
          message: err instanceof Error ? err.message : 'Invalid JSON',
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });
}

/**
 * Every paid tier, including ones added later, or only the tiers the join table lists for
 * the section. Stored as a choice rather than read off an empty list, so a section limited
 * to some tiers can never quietly widen to all of them.
 */
const TierScope = z.enum(['all_paid', 'selected_paid']);
export type TierScope = z.infer<typeof TierScope>;

/**
 * The sections as the row stores them, each JSON or null when switched off. Which tiers a
 * limited section names is the join table, and where a value lands is the binding for its
 * port.
 */
export const SectionColumns = z.object({
  shipping: jsonColumn(
    z.object({
      tier_scope: TierScope,
      allowed_countries: z.array(z.string()).nullable(),
    }),
  ).nullable(),
  phone: jsonColumn(z.object({ tier_scope: TierScope })).nullable(),
  tax_number: jsonColumn(z.object({ tier_scope: TierScope })).nullable(),
});
export type StoredSections = z.output<typeof SectionColumns>;

export function selectedTiers(rows: DbCheckoutConfigTier[]): Map<CheckoutSection, string[]> {
  const bySection = new Map<CheckoutSection, string[]>();
  for (const row of rows.map((candidate) => DbCheckoutConfigTier.parse(candidate))) {
    bySection.set(row.section, [...(bySection.get(row.section) ?? []), row.product_id]);
  }
  return bySection;
}

/** A port's binding, and whether the field it points at can take a value right now. */
export const BoundPortRow = z.object({
  port: z.enum(STRIPE_PORTS),
  metafield_key: z.string(),
  active_key: z.string().nullable(),
});
export type BoundPortRow = z.input<typeof BoundPortRow>;

export interface BoundPort {
  key: string;
  active: boolean;
}

export interface ConfigParts {
  config: StripeCheckoutConfig;
  /**
   * Whether a section has anywhere to put what it collects. A section whose fields are all
   * archived stays configured, and is not asked for until one of them is restored.
   */
  collectable: { shipping: boolean; phone: boolean };
}

export function boundPorts(rows: BoundPortRow[]): Map<StripePort, BoundPort> {
  return new Map(
    rows.map((row) => {
      const bound = BoundPortRow.parse(row);
      return [bound.port, { key: bound.metafield_key, active: bound.active_key !== null }];
    }),
  );
}

export function assemble(
  sections: StoredSections,
  selected: Map<CheckoutSection, string[]>,
  bound: Map<StripePort, BoundPort>,
): ConfigParts {
  const name = bound.get(STRIPE_PORT.shippingName);
  const address = bound.get(STRIPE_PORT.shippingAddress);
  const phone = bound.get(STRIPE_PORT.phone);
  const tierIds = (section: CheckoutSection, scope: TierScope) =>
    scope === 'all_paid' ? null : (selected.get(section) ?? []);
  // Limited to tiers that have all been deleted, a section collects nothing, so it reads as
  // off rather than as an empty list a save would refuse, and never widens to every tier.
  const applies = <T extends { tier_scope: TierScope }>(
    section: CheckoutSection,
    stored: T | null,
  ): stored is T =>
    stored !== null &&
    (stored.tier_scope === 'all_paid' || (selected.get(section)?.length ?? 0) > 0);

  return {
    config: {
      // A binding goes with its field when the field is deleted, so a section can be on
      // with nowhere to put what it collects. It reads as off, the same as one switched off.
      shipping:
        applies('shipping', sections.shipping) && name && address
          ? {
              tierIds: tierIds('shipping', sections.shipping.tier_scope),
              allowedCountries: sections.shipping.allowed_countries,
              nameCustomFieldKey: name.key,
              addressCustomFieldKey: address.key,
            }
          : null,
      phone:
        applies('phone', sections.phone) && phone
          ? { tierIds: tierIds('phone', sections.phone.tier_scope), customFieldKey: phone.key }
          : null,
      taxNumber: applies('tax_number', sections.tax_number)
        ? { tierIds: tierIds('tax_number', sections.tax_number.tier_scope) }
        : null,
    },
    collectable: {
      // Stripe collects the recipient's name and their address under one parameter, so it
      // asks for both or neither. Archiving one of the two destinations is the publisher
      // saying they no longer want that half: the step is still worth asking for while the
      // other half can land, and whatever arrives for the archived one is dropped. Only
      // archiving both leaves nothing worth asking for.
      shipping: Boolean(name?.active || address?.active),
      phone: Boolean(phone?.active),
    },
  };
}
