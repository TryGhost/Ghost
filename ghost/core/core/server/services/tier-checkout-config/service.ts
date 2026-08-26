import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import { z } from 'zod';
import type { Knex } from 'knex';
import type { FieldType } from '@tryghost/custom-field-types';
import { DbCustomField, FIELD_STATUS } from '../members-custom-fields/schema';
import type { CustomField, RequestContext } from '../members-custom-fields';
import {
  MAX_CHECKOUT_LABEL_LENGTH,
  STRIPE_PORT,
  isCheckoutEligible,
  isStripePort,
  type StripePort,
} from '../stripe/services/checkout/field-ports';
import {
  collectionRowCodec,
  optionsCodec,
  questionRowCodec,
  type CollectionParts,
  type CollectionRow,
  type QuestionParts,
} from './codec';
import {
  BINDINGS_TABLE,
  CONFIG_TABLE,
  FIELDS_TABLE,
  QUESTIONS_TABLE,
  collectionRowsForTier,
  configuredCollectionRows,
  questionRows,
} from './queries';
import {
  emptyCollection,
  type ResolvedCheckout,
  type ResolvedQuestion,
  type TierCheckoutConfig,
} from './models';
import { PORT_FIELD } from './destinations';
import { CheckoutConfigInput } from './serializers';

type FieldRow = Pick<z.infer<typeof DbCustomField>, 'key' | 'name' | 'type' | 'status'>;

type NewField = { key: string; name: string; type: FieldType };

/**
 * A request states its settings in named sections: one for shipping, one for phone. Each
 * section stands for one or more of the values Stripe hands back when a checkout is
 * completed — shipping covers both the recipient's name and their address, phone covers
 * only the phone number.
 *
 * Naming those values here means that a request which includes a section settles every
 * value in it: each one is either given a destination or has its old one removed. Without
 * this list, a value the request never mentioned could keep a destination from an earlier
 * save that the publisher believes they have turned off.
 */
const BLOCK_PORTS = {
  shipping: [STRIPE_PORT.shippingName, STRIPE_PORT.shippingAddress],
  phone: [STRIPE_PORT.phone],
} as const satisfies Record<string, readonly StripePort[]>;

interface CollectionPlan {
  clear: StripePort[];
  create: NewField[];
  bind: Array<{ port: StripePort; key: string }>;
}

export interface PortBinder {
  bind(
    db: Knex,
    productId: string,
    port: string,
    customFieldKey: string,
    now: Date,
  ): Promise<string>;
  remove(db: Knex, productId: string, port: string): Promise<void>;
}

export interface FieldMaker {
  findByKey(key: string, options?: { executor?: Knex }): Promise<CustomField | null>;
  addOne(wanted: NewField, options?: { executor?: Knex }): Promise<CustomField>;
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

  async browse(): Promise<TierCheckoutConfig[]> {
    const rows = decodeCollection(await configuredCollectionRows(this.knex));
    if (rows.length === 0) {
      return [];
    }

    const asked = await this.questions();
    return rows.map((row) => assemble(row, asked.get(row.tierId) ?? []));
  }

  async read(productId: string): Promise<TierCheckoutConfig | null> {
    const [row] = decodeCollection(await collectionRowsForTier(this.knex, productId));
    if (!row) {
      throw new errors.NotFoundError({ message: 'Tier not found.' });
    }
    if (!row.configured) {
      return null;
    }

    const asked = await this.questions(productId);
    return assemble(row, asked.get(productId) ?? []);
  }

  async resolve(productId: string): Promise<ResolvedCheckout> {
    const [row] = decodeCollection(await collectionRowsForTier(this.knex, productId));
    if (!row?.configured) {
      return { customFields: [], ...emptyCollection() };
    }

    const asked = await this.questions(productId);
    const customFields: ResolvedQuestion[] = (asked.get(productId) ?? []).flatMap((entry) =>
      entry.askable ? [{ ...entry.question, ...entry.askable }] : [],
    );
    return { customFields, ...row.collecting };
  }

  /**
   * Saves the checkout settings a request states, and leaves the rest alone.
   *
   * A request only has to include the sections it wants to change. Say nothing about
   * shipping and the shipping settings stay exactly as they were, so a client that only
   * knows how to edit the questions cannot wipe out the shipping settings by omitting
   * them.
   */
  async edit(context: RequestContext, productId: string, input: unknown): Promise<void> {
    const stated = parseInput(input);
    const now = new Date();

    if (stated.custom_fields) {
      await assertQuestionsAskable(this.knex, stated.custom_fields);
    }
    const plan = await this.planCollection(stated);

    const created = await this.knex.transaction(async (trx) => {
      await assertTierExists(trx, productId);
      await writeOptions(trx, productId, stated, now);

      for (const port of plan.clear) {
        await this.bindings.remove(trx, productId, port);
      }

      const made: CustomField[] = [];
      for (const wanted of plan.create) {
        made.push(await this.fields.addOne(wanted, { executor: trx }));
      }
      for (const { port, key } of plan.bind) {
        await this.bindings.bind(trx, productId, port, key, now);
      }

      if (stated.custom_fields) {
        await this.writeQuestions(trx, productId, stated.custom_fields, now);
      }
      return made;
    });

    await this.fields.recordCreated(context, created);
  }

  private async questions(productId?: string): Promise<Map<string, QuestionParts[]>> {
    const rows = await questionRows(this.knex, productId);
    const byTier = new Map<string, QuestionParts[]>();
    for (const row of rows) {
      const parts = z.decode(questionRowCodec, row);
      const forTier = byTier.get(parts.tierId) ?? [];
      forTier.push(parts);
      byTier.set(parts.tierId, forTier);
    }
    return byTier;
  }

  private async planCollection(stated: CheckoutConfigInput): Promise<CollectionPlan> {
    const wanted: Array<{ port: StripePort; key: string }> = [];

    if (stated.shipping?.collect) {
      wanted.push(
        { port: STRIPE_PORT.shippingName, key: stated.shipping.name.custom_field_key },
        { port: STRIPE_PORT.shippingAddress, key: stated.shipping.address.custom_field_key },
      );
    }
    if (stated.phone?.collect) {
      wanted.push({ port: STRIPE_PORT.phone, key: stated.phone.custom_field_key });
    }

    const bound = new Set<StripePort>(wanted.map(({ port }) => port));
    const clear: StripePort[] = [];
    for (const block of ['shipping', 'phone'] as const) {
      if (stated[block]) {
        clear.push(...BLOCK_PORTS[block].filter((port) => !bound.has(port)));
      }
    }

    const create = new Map<string, NewField>();
    for (const { port, key } of wanted) {
      const wants = PORT_FIELD[port];
      const existing = await this.fields.findByKey(key);
      if (existing) {
        assertCollectableInto(port, existing, wants.type);
        continue;
      }

      const alreadyPlanned = create.get(key);
      if (alreadyPlanned && alreadyPlanned.type !== wants.type) {
        throw new errors.ValidationError({
          message: `This can only be collected into a ${wants.type} field.`,
          property: `checkout.${port}.custom_field_key`,
        });
      }
      if (!alreadyPlanned) {
        create.set(key, { key, name: wants.name, type: wants.type });
      }
    }

    return { clear, create: [...create.values()], bind: wanted };
  }

  /**
   * Saves the questions this tier asks its buyers during checkout.
   *
   * A binding records that one value coming back from Stripe belongs in one custom field,
   * and it identifies the value by the name Stripe uses for it. For a question that name
   * is the custom field's own key: Ghost sends the key to Stripe as the question's
   * identifier, and Stripe returns the buyer's answer labelled with that same key. That is
   * why the key is passed twice below — once as the name Stripe will answer under, and
   * once as the field the answer is stored in.
   */
  private async writeQuestions(
    trx: Knex.Transaction,
    productId: string,
    questions: NonNullable<CheckoutConfigInput['custom_fields']>,
    now: Date,
  ): Promise<void> {
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
      await trx(QUESTIONS_TABLE).where('binding_id', bindingId).del();
      await trx(QUESTIONS_TABLE).insert({
        id: new ObjectID().toHexString(),
        binding_id: bindingId,
        sort_order: index,
        label: question.label ?? null,
        optional: question.optional ?? true,
        created_at: now,
      });
    }
  }
}

function parseInput(input: unknown): CheckoutConfigInput {
  const parsed = CheckoutConfigInput.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  const issue = parsed.error.issues[0];
  throw new errors.ValidationError({
    message: issue.message,
    property: issue.path.join('.') || 'checkout',
  });
}

function decodeCollection(rows: CollectionRow[]): CollectionParts[] {
  return rows.map((row) => z.decode(collectionRowCodec, row));
}

function assemble(row: CollectionParts, asked: QuestionParts[]): TierCheckoutConfig {
  return {
    tierId: row.tierId,
    customFields: asked.map((entry) => entry.question),
    ...row.collection,
  };
}

async function assertTierExists(db: Knex, productId: string): Promise<void> {
  const tier = await db('products').where('id', productId).first();
  if (!tier) {
    throw new errors.NotFoundError({ message: 'Tier not found.' });
  }
}

/**
 * Refuses a custom field that cannot hold what Stripe will send back.
 *
 * A request names the custom field each collected value should be saved into. That field
 * has to be active, because an archived field accepts no new values, and it has to store
 * the right kind of data: Stripe returns a structured address for the shipping address,
 * and plain text for a name or a phone number.
 *
 * Both refusals are deliberate rather than defensive. Ghost could save the value into some
 * other field, or accept the request and quietly collect nothing, but a publisher who named
 * a field meant that field. Being told now is better than finding out weeks later that
 * nothing was ever recorded.
 */
function assertCollectableInto(port: StripePort, field: CustomField, valueType: FieldType): void {
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
}

async function writeOptions(
  trx: Knex.Transaction,
  productId: string,
  stated: CheckoutConfigInput,
  now: Date,
): Promise<void> {
  const all = z.encode(optionsCodec, {
    shippingAllowedCountries: stated.shipping?.collect ? stated.shipping.allowed_countries : [],
    taxNumber: stated.tax_number?.collect ?? false,
  });

  // Only the columns this request spoke about are written, so two requests changing
  // different parts of the same tier cannot undo each other, and a request that mentions
  // neither still leaves the row behind as the record that this tier has been set up.
  const columns = {
    ...(stated.shipping ? { shipping_allowed_countries: all.shipping_allowed_countries } : {}),
    ...(stated.tax_number ? { tax_number_collect: all.tax_number_collect } : {}),
  };

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
  db: Knex,
  questions: NonNullable<CheckoutConfigInput['custom_fields']>,
): Promise<void> {
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

  const rows: FieldRow[] = await db(FIELDS_TABLE)
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
