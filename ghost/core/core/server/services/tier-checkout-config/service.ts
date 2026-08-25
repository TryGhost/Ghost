import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import { z } from 'zod';
import type { Knex } from 'knex';
import type { FieldType } from '@tryghost/custom-field-types';
import { FIELD_STATUS } from '../members-custom-fields/schema';
import type { CustomField, RequestContext } from '../members-custom-fields';
import {
  MAX_CHECKOUT_LABEL_LENGTH,
  STRIPE_PORT,
  isCheckoutEligible,
  isStripePort,
  type StripePort,
} from '../stripe/services/checkout/field-ports';
import { checkoutRowCodec, optionsCodec, type CheckoutRowParts } from './codec';
import {
  BINDINGS_TABLE,
  CONFIG_TABLE,
  FIELDS_TABLE,
  QUESTIONS_TABLE,
  checkoutRows,
} from './queries';
import {
  emptyCheckoutConfig,
  type CheckoutConfigResult,
  type ResolvedCheckout,
  type ResolvedQuestion,
  type TierCheckoutConfig,
} from './models';
import { PORT_DESTINATION } from './destinations';
import { CheckoutConfigInput } from './serializers';

interface FieldRow {
  key: string;
  name: string;
  type: string;
  status: string;
}

export interface PortBinder {
  bind(
    db: Knex,
    productId: string,
    port: string,
    customFieldKey: string,
    now: Date,
  ): Promise<string>;
  unbind(db: Knex, productId: string, port: string, now: Date): Promise<void>;
  remove(db: Knex, productId: string, port: string): Promise<void>;
  destinationFor(db: Knex, productId: string, port: string): Promise<string | null>;
}

export interface FieldMaker {
  findByKey(key: string, options?: { executor?: Knex }): Promise<CustomField | null>;
  addOne(
    wanted: { key: string; name: string; type: FieldType },
    options?: { executor?: Knex },
  ): Promise<CustomField>;
  recordCreated(context: RequestContext, fields: CustomField[]): Promise<void>;
}

export class TierCheckoutConfigService {
  private knex: Knex;
  private bindings: PortBinder;
  private fields: FieldMaker;

  constructor({
    knex,
    bindings,
    fields,
  }: {
    knex: Knex;
    bindings: PortBinder;
    fields: FieldMaker;
  }) {
    this.knex = knex;
    this.bindings = bindings;
    this.fields = fields;
  }

  async browse(): Promise<CheckoutConfigResult> {
    return { tiers: [...fold(await this.readRows()).values()] };
  }

  async read(productId: string): Promise<CheckoutConfigResult> {
    const configs = fold(await this.readRows(productId));
    const config = configs.get(productId);
    if (config) {
      return { tiers: [config] };
    }

    const tier = await this.knex('products').where('id', productId).first();
    if (!tier) {
      throw new errors.NotFoundError({ message: 'Tier not found.' });
    }
    return { tiers: [emptyCheckoutConfig(productId)] };
  }

  private async readRows(productId?: string): Promise<CheckoutRowParts[]> {
    const rows = await checkoutRows(this.knex, productId);
    return rows.map((row) => z.decode(checkoutRowCodec, row));
  }

  async resolve(productId: string): Promise<ResolvedCheckout> {
    const rows = await this.readRows(productId);
    const [row] = rows;
    if (!row) {
      return { customFields: [], shipping: null, taxNumber: false, phone: null };
    }

    const customFields: ResolvedQuestion[] = rows
      .filter((candidate) => candidate.question && candidate.askable)
      .map((candidate) => ({ ...candidate.question!, ...candidate.askable! }));

    return { customFields, ...row.collecting };
  }

  /** A part the request does not name is left as it was. */
  async edit(
    context: RequestContext,
    productId: string,
    input: unknown,
  ): Promise<CheckoutConfigResult> {
    const parsed = CheckoutConfigInput.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new errors.ValidationError({
        message: issue.message,
        property: issue.path.join('.') || 'checkout',
      });
    }
    const stated = parsed.data;
    const now = new Date();
    const provisioned: CustomField[] = [];

    await this.knex.transaction(async (trx) => {
      if (stated.custom_fields) {
        await this.writeQuestions(trx, productId, stated.custom_fields, now);
      }
      if (stated.shipping) {
        await this.writeBinding(
          trx,
          productId,
          STRIPE_PORT.shippingName,
          {
            collect: stated.shipping.collect,
            custom_field_key: stated.shipping.name?.custom_field_key,
          },
          provisioned,
          now,
        );
        await this.writeBinding(
          trx,
          productId,
          STRIPE_PORT.shippingAddress,
          {
            collect: stated.shipping.collect,
            custom_field_key: stated.shipping.address?.custom_field_key,
          },
          provisioned,
          now,
        );
      }
      if (stated.phone) {
        await this.writeBinding(trx, productId, STRIPE_PORT.phone, stated.phone, provisioned, now);
      }
      if (stated.shipping || stated.tax_number) {
        await writeOptions(trx, productId, stated, now);
      }
    });

    // After the commit: the history writes on its own connection, which a
    // single-connection pool would deadlock against an open transaction.
    await this.fields.recordCreated(context, provisioned);

    return this.read(productId);
  }

  /**
   * A question's port is the field's own key, because the processor hands back the key
   * it was sent — which is what makes the answer recognisable without a lookup.
   */
  private async writeQuestions(
    trx: Knex.Transaction,
    productId: string,
    questions: NonNullable<CheckoutConfigInput['custom_fields']>,
    now: Date,
  ): Promise<void> {
    await assertQuestionsAskable(trx, productId, questions);

    const asked = new Set(questions.map((question) => question.key));
    const alreadyAsked: Array<{ port: string }> = await trx(QUESTIONS_TABLE)
      .join(BINDINGS_TABLE, `${BINDINGS_TABLE}.id`, `${QUESTIONS_TABLE}.binding_id`)
      .where(`${BINDINGS_TABLE}.product_id`, productId)
      .select(`${BINDINGS_TABLE}.port`);
    for (const { port } of alreadyAsked) {
      if (!asked.has(port)) {
        await this.bindings.remove(trx, productId, port);
      }
    }

    for (const [index, question] of questions.entries()) {
      const bindingId = await this.bindings.bind(trx, productId, question.key, question.key, now);
      const asking = {
        sort_order: index,
        label: question.label ?? null,
        optional: question.optional ?? true,
      };

      const updated = await trx(QUESTIONS_TABLE)
        .where('binding_id', bindingId)
        .update({ ...asking, updated_at: now });
      if (updated === 0) {
        await trx(QUESTIONS_TABLE).insert({
          id: new ObjectID().toHexString(),
          binding_id: bindingId,
          created_at: now,
          ...asking,
        });
      }
    }
  }

  private async writeBinding(
    trx: Knex.Transaction,
    productId: string,
    port: StripePort,
    stated: { collect: boolean; custom_field_key?: string },
    provisioned: CustomField[],
    now: Date,
  ): Promise<void> {
    if (!stated.collect) {
      await this.bindings.unbind(trx, productId, port, now);
      return;
    }

    const key = stated.custom_field_key
      ? await assertCollectableInto(
          trx,
          productId,
          port,
          stated.custom_field_key,
          PORT_DESTINATION[port].type,
        )
      : await this.resolveDestination(trx, productId, port, provisioned);

    await this.bindings.bind(trx, productId, port, key, now);
  }

  private async resolveDestination(
    trx: Knex.Transaction,
    productId: string,
    port: StripePort,
    provisioned: CustomField[],
  ): Promise<string> {
    const settled = await this.bindings.destinationFor(trx, productId, port);
    if (settled) {
      return settled;
    }

    const wanted = PORT_DESTINATION[port];
    const existing = await this.fields.findByKey(wanted.key, { executor: trx });
    if (existing && existing.type === wanted.type && existing.status === FIELD_STATUS.active) {
      return existing.key;
    }

    const created = await this.fields.addOne(wanted, { executor: trx });
    provisioned.push(created);
    return created.key;
  }
}

function fold(rows: CheckoutRowParts[]): Map<string, TierCheckoutConfig> {
  const configs = new Map<string, TierCheckoutConfig>();

  for (const row of rows) {
    const config = configs.get(row.tierId) ?? emptyCheckoutConfig(row.tierId);
    if (row.question) {
      config.customFields.push(row.question);
    }
    Object.assign(config, row.collection);
    configs.set(row.tierId, config);
  }

  return configs;
}

async function assertCollectableInto(
  trx: Knex.Transaction,
  productId: string,
  port: StripePort,
  customFieldKey: string,
  valueType: FieldType,
): Promise<string> {
  const field = await trx(FIELDS_TABLE).where('key', customFieldKey).first();
  if (!field) {
    throw new errors.ValidationError({
      message: `Unknown custom field: ${customFieldKey}`,
      property: `checkout.${port}.custom_field_key`,
    });
  }
  if (field.status !== FIELD_STATUS.active) {
    throw new errors.ValidationError({
      message: 'An archived custom field cannot receive collected data. Restore it first.',
      property: `checkout.${port}.custom_field_key`,
    });
  }
  if (field.type !== valueType) {
    throw new errors.ValidationError({
      message: `This can only be collected into a ${valueType} field.`,
      property: `checkout.${port}.custom_field_key`,
    });
  }

  return customFieldKey;
}

/**
 * Read before written, because a request states one block at a time and the others must
 * survive it. The read runs on `trx`: a single-connection pool deadlocks reading around
 * an open transaction.
 */
async function writeOptions(
  trx: Knex.Transaction,
  productId: string,
  stated: CheckoutConfigInput,
  now: Date,
): Promise<void> {
  const row = await trx(CONFIG_TABLE).where('product_id', productId).first();
  const current = row
    ? z.decode(optionsCodec, {
        shipping_allowed_countries: row.shipping_allowed_countries,
        tax_number_collect: row.tax_number_collect,
      })
    : { shippingAllowedCountries: [], taxNumber: false };

  const columns = z.encode(optionsCodec, {
    shippingAllowedCountries: stated.shipping
      ? stated.shipping.collect
        ? (stated.shipping.allowed_countries ?? [])
        : []
      : current.shippingAllowedCountries,
    taxNumber: stated.tax_number ? stated.tax_number.collect : current.taxNumber,
  });

  await trx(CONFIG_TABLE)
    .insert({
      id: new ObjectID().toHexString(),
      product_id: productId,
      created_at: now,
      updated_at: now,
      ...columns,
    })
    .onConflict('product_id')
    .merge({ ...columns, updated_at: now });
}

async function assertQuestionsAskable(
  trx: Knex.Transaction,
  productId: string,
  questions: NonNullable<CheckoutConfigInput['custom_fields']>,
): Promise<void> {
  // A question's port is the field's key, so a field keyed like a port this tier collects
  // would want a port already taken, which the unique index refuses unreadably.
  const collides = questions.find((question) => isStripePort(question.key));
  if (collides) {
    throw new errors.ValidationError({
      message: `A field keyed ${collides.key} cannot be asked at checkout, because that is what this checkout calls something it collects for itself.`,
      property: 'checkout.custom_fields',
    });
  }

  const keys = questions.map((question) => question.key);
  if (keys.length === 0) {
    return;
  }

  const rows: FieldRow[] = await trx(FIELDS_TABLE)
    .whereIn(`${FIELDS_TABLE}.key`, keys)
    .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
    .select(
      `${FIELDS_TABLE}.key`,
      `${FIELDS_TABLE}.name`,
      `${FIELDS_TABLE}.type`,
      `${FIELDS_TABLE}.status`,
    );
  const byKey = new Map(rows.map((row) => [row.key, row]));

  for (const question of questions) {
    const field = byKey.get(question.key);
    if (!field) {
      throw new errors.ValidationError({
        message: `Unknown custom field: ${question.key}`,
        property: 'checkout.custom_fields',
      });
    }
    if (!isCheckoutEligible(field.type)) {
      throw new errors.ValidationError({
        message: `A ${field.type} field cannot be asked for at checkout.`,
        property: 'checkout.custom_fields',
      });
    }
    const prompt = question.label ?? field.name;
    if (prompt.length > MAX_CHECKOUT_LABEL_LENGTH) {
      throw new errors.ValidationError({
        message: `A checkout question can be at most ${MAX_CHECKOUT_LABEL_LENGTH} characters. Give this one a shorter label.`,
        property: 'checkout.custom_fields',
      });
    }
  }
}
