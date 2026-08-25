import type { Knex } from 'knex';
import { FIELD_STATUS } from '../members-custom-fields/schema';
import { STRIPE_PORT } from '../stripe/services/checkout/field-ports';
import { DbCheckoutOptions } from './schema';
import type { CheckoutRow } from './codec';

export const QUESTIONS_TABLE = 'products_checkout_fields';
export const CONFIG_TABLE = 'products_checkout_config';
export const BINDINGS_TABLE = 'members_custom_field_bindings';
export const FIELDS_TABLE = 'members_custom_fields';

const ACTIVE = FIELD_STATUS.active;

const optionColumns = Object.keys(DbCheckoutOptions.shape).map(
  (column) => `${CONFIG_TABLE}.${column}`,
);

/**
 * A tier's whole configuration in one read, anchored on products so a tier that only
 * asks questions and one that only collects both come back.
 *
 * Status and `active` sit in the ON clauses rather than the WHERE, so an archived field
 * or a stopped binding answers as absent instead of as a row to test later.
 */
export function checkoutRows(db: Knex, productId?: string) {
  const bindTo = (alias: string, port: string) =>
    function (this: Knex.JoinClause) {
      this.on(`${alias}.product_id`, 'products.id')
        .andOn(db.raw(`${alias}.port = ?`, [port]))
        .andOn(db.raw(`${alias}.active = ?`, [true]));
    };

  const query = db('products')
    .leftJoin({ question_binding: BINDINGS_TABLE }, 'question_binding.product_id', 'products.id')
    .leftJoin(QUESTIONS_TABLE, `${QUESTIONS_TABLE}.binding_id`, 'question_binding.id')
    .leftJoin({ question_field: FIELDS_TABLE }, function () {
      this.on('question_field.key', 'question_binding.custom_field_key').andOn(
        db.raw('question_field.status = ?', [ACTIVE]),
      );
    })

    .leftJoin(CONFIG_TABLE, `${CONFIG_TABLE}.product_id`, 'products.id')

    .leftJoin({ name_binding: BINDINGS_TABLE }, bindTo('name_binding', STRIPE_PORT.shippingName))
    .leftJoin({ name_field: FIELDS_TABLE }, function () {
      this.on('name_field.key', 'name_binding.custom_field_key').andOn(
        db.raw('name_field.status = ?', [ACTIVE]),
      );
    })

    .leftJoin(
      { shipping_binding: BINDINGS_TABLE },
      bindTo('shipping_binding', STRIPE_PORT.shippingAddress),
    )
    .leftJoin({ shipping_field: FIELDS_TABLE }, function () {
      this.on('shipping_field.key', 'shipping_binding.custom_field_key').andOn(
        db.raw('shipping_field.status = ?', [ACTIVE]),
      );
    })

    .leftJoin({ phone_binding: BINDINGS_TABLE }, bindTo('phone_binding', STRIPE_PORT.phone))
    .leftJoin({ phone_field: FIELDS_TABLE }, function () {
      this.on('phone_field.key', 'phone_binding.custom_field_key').andOn(
        db.raw('phone_field.status = ?', [ACTIVE]),
      );
    })

    .where(function () {
      this.where('question_binding.active', true).orWhere(
        `${CONFIG_TABLE}.tax_number_collect`,
        true,
      );
    })
    .orderBy('products.id', 'asc')
    .orderBy(`${QUESTIONS_TABLE}.sort_order`, 'asc')
    .orderBy(`${QUESTIONS_TABLE}.id`, 'asc')
    .select<CheckoutRow[]>([
      'products.id as product_id',
      `${QUESTIONS_TABLE}.label`,
      `${QUESTIONS_TABLE}.optional`,
      'question_binding.port as port',
      'question_binding.custom_field_key as question_key',
      'question_field.name as question_name',
      'question_field.type as question_type',
      ...optionColumns,
      'name_binding.custom_field_key as shipping_name_key',
      'name_field.key as shipping_name_collectable',
      'shipping_binding.custom_field_key as shipping_address_key',
      'shipping_field.key as shipping_address_collectable',
      'phone_binding.custom_field_key as phone_key',
      'phone_field.key as phone_collectable',
    ]);

  if (productId) {
    query.where('products.id', productId);
  }
  return query;
}
