import type { Knex } from 'knex';
import { FIELD_STATUS } from '../members-metafields/schema';
import { STRIPE_PORT } from '@tryghost/checkout';
import { DbCheckoutOptions } from './schema';
import type { CollectionRow } from './codec';

export const CONFIG_TABLE = 'products_checkout_config';
export const BINDINGS_TABLE = 'members_metafield_bindings';
export const FIELDS_TABLE = 'members_metafields';

const ACTIVE = FIELD_STATUS.active;

const optionColumns = Object.keys(DbCheckoutOptions.shape).map(
  (column) => `${CONFIG_TABLE}.${column}`,
);

function collectionQuery(db: Knex) {
  const bindTo = (alias: string, port: string) =>
    function (this: Knex.JoinClause) {
      this.on(`${alias}.product_id`, 'products.id').andOn(db.raw(`${alias}.port = ?`, [port]));
    };

  const landsIn = (alias: string, binding: string) =>
    function (this: Knex.JoinClause) {
      this.on(`${alias}.key`, `${binding}.metafield_key`).andOn(
        db.raw(`${alias}.status = ?`, [ACTIVE]),
      );
    };

  const query = db('products')
    .leftJoin(CONFIG_TABLE, `${CONFIG_TABLE}.product_id`, 'products.id')
    .leftJoin({ name_binding: BINDINGS_TABLE }, bindTo('name_binding', STRIPE_PORT.shippingName))
    .leftJoin({ name_field: FIELDS_TABLE }, landsIn('name_field', 'name_binding'))
    .leftJoin(
      { shipping_binding: BINDINGS_TABLE },
      bindTo('shipping_binding', STRIPE_PORT.shippingAddress),
    )
    .leftJoin({ shipping_field: FIELDS_TABLE }, landsIn('shipping_field', 'shipping_binding'))
    .leftJoin({ phone_binding: BINDINGS_TABLE }, bindTo('phone_binding', STRIPE_PORT.phone))
    .leftJoin({ phone_field: FIELDS_TABLE }, landsIn('phone_field', 'phone_binding'))
    .orderBy('products.id', 'asc')
    .select<CollectionRow[]>([
      'products.id as product_id',
      `${CONFIG_TABLE}.id as config_id`,
      ...optionColumns,
      'name_binding.metafield_key as shipping_name_key',
      'name_field.key as shipping_name_collectable',
      'shipping_binding.metafield_key as shipping_address_key',
      'shipping_field.key as shipping_address_collectable',
      'phone_binding.metafield_key as phone_key',
      'phone_field.key as phone_collectable',
    ]);

  return query;
}

/** One row, whether or not that tier has ever been configured. */
export function collectionRowsForTier(db: Knex, productId: string) {
  return collectionQuery(db).where('products.id', productId);
}

/**
 * This query starts from products, so without a filter it would return every tier on the
 * site, configured or not. A tier only gets a row in products_checkout_config when someone
 * saves checkout settings for it, so requiring that row narrows the list to the tiers
 * somebody has actually set up. A tier that was set up and then had everything switched off
 * keeps its row and stays in the list, reporting that it collects nothing.
 */
export function configuredCollectionRows(db: Knex) {
  return collectionQuery(db).whereNotNull(`${CONFIG_TABLE}.id`);
}
