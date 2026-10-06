import type { Knex } from 'knex';
import { STRIPE_PORTS } from '@tryghost/checkout';
import { FIELD_STATUS } from '../members-metafields/schema';
import type { BoundPortRow } from './codec';
import type { DbCheckoutConfigTier, DbSections } from './schema';

export const CONFIG_TABLE = 'stripe_checkout_config';
export const CONFIG_TIERS_TABLE = 'stripe_checkout_config_tiers';
const BINDINGS_TABLE = 'members_metafield_bindings';
const FIELDS_TABLE = 'members_metafields';

/** The only row. A slug rather than "the first row", so a save can upsert on it. */
export const CONFIG_SLUG = 'default';

/** Nothing switched on, which is what a site that never saved this has. */
const NO_SECTIONS: DbSections = { shipping: null, phone: null, tax_number: null };

export async function sectionColumns(db: Knex): Promise<DbSections> {
  const row = await db(CONFIG_TABLE)
    .where('slug', CONFIG_SLUG)
    .select('shipping', 'phone', 'tax_number')
    .first();
  return row ?? NO_SECTIONS;
}

/** Ordered by tier so a section's list reads back the same every time. */
export function selectedTierRows(db: Knex) {
  return db(CONFIG_TIERS_TABLE)
    .orderBy('product_id', 'asc')
    .select<DbCheckoutConfigTier[]>('section', 'product_id');
}

/** Where each of Stripe's ports lands, and whether that field can take a value right now. */
export function boundPortRows(db: Knex) {
  return db(BINDINGS_TABLE)
    .leftJoin(FIELDS_TABLE, function () {
      this.on(`${FIELDS_TABLE}.key`, `${BINDINGS_TABLE}.metafield_key`).andOn(
        db.raw(`${FIELDS_TABLE}.status = ?`, [FIELD_STATUS.active]),
      );
    })
    .whereIn(`${BINDINGS_TABLE}.port`, [...STRIPE_PORTS])
    .select<BoundPortRow[]>([
      `${BINDINGS_TABLE}.port`,
      `${BINDINGS_TABLE}.metafield_key`,
      `${FIELDS_TABLE}.key as active_key`,
    ]);
}

export function tierTypes(db: Knex, ids: string[]) {
  return db('products')
    .whereIn('id', ids)
    .select<Array<{ id: string; type: string }>>('id', 'type');
}
