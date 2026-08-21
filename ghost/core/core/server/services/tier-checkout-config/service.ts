import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import {z} from 'zod';
import type {Knex} from 'knex';
import {FIELD_STATUS} from '../members-custom-fields/schema';
import {
    CHECKOUT_ELIGIBLE_FIELD_TYPES,
    MAX_CHECKOUT_LABEL_LENGTH,
    STRIPE_PORT,
    STRIPE_PORTS,
    type StripePort
} from '../stripe/services/checkout/field-ports';
import {DbCheckoutCollection} from './schema';
import {checkoutRowCodec, collectionCodec, type CheckoutRowParts} from './codec';
import {BINDINGS_TABLE, CONFIG_TABLE, FIELDS_TABLE, QUESTIONS_TABLE, checkoutRows} from './queries';
import {
    emptyCheckoutConfig,
    type CheckoutConfigResult,
    type ResolvedCheckout,
    type ResolvedQuestion,
    type StoredCollection,
    type TierCheckoutConfig
} from './models';
import {CheckoutConfigInput} from './serializers';

/**
 * What a tier's checkout asks and collects.
 *
 * ## The rule this lives by
 *
 * A tier says what its checkout asks. Where the answers land is either already settled or
 * settled site-wide, and never per tier. A question's answer comes back under the key Ghost
 * sent with it, so the field a publisher picked *is* the destination. What a processor
 * collects under its own vocabulary comes back with no key at all, so a tier says whether
 * to collect it and a binding says where it goes.
 *
 * Bindings are written from here rather than through anything else. Creating one is what
 * turning collection on *means*, so it belongs in the same statement and the same
 * transaction: a tier that saved its collection but not its destination would collect into
 * nowhere, and the reverse would move every other tier's destination for a write that
 * failed.
 *
 * ## What is validated, and what is tolerated
 *
 * Refused at write, tolerated at read. A question naming an archived field, or a collection
 * whose destination has since been archived, stops being asked and stays in the table, so
 * restoring the field brings it back without the publisher rebuilding anything.
 */

/** The columns that say a tier wants something collected, checked against the row's shape. */
type CollectColumn = {
    [K in keyof DbCheckoutCollection]: DbCheckoutCollection[K] extends boolean ? K : never
}[keyof DbCheckoutCollection];

interface FieldRow {
    key: string;
    name: string;
    type: string;
    status: string;
}

export class TierCheckoutConfigService {
    private knex: Knex;

    constructor({knex}: {knex: Knex}) {
        this.knex = knex;
    }

    /**
     * Every tier that has configured something, each as one aggregate.
     *
     * One query, folded into objects. Everything a configuration is made of arrives on the
     * same row — the questions, the collection columns, and the destination each collected
     * thing currently has — and which tiers count as configured is settled by the query
     * too, so nothing is looked up or sifted a second time.
     */
    async browse(): Promise<CheckoutConfigResult> {
        return {tiers: [...fold(await this.readRows()).values()]};
    }

    async read(productId: string): Promise<CheckoutConfigResult> {
        const configs = fold(await this.readRows(productId));
        return {tiers: [configs.get(productId) ?? emptyCheckoutConfig(productId)]};
    }

    /** Every row the joined read returns, each already read as the parts it carries. */
    private async readRows(productId?: string): Promise<CheckoutRowParts[]> {
        const rows = await checkoutRows(this.knex, productId);
        return rows.map(row => z.decode(checkoutRowCodec, row));
    }

    /**
     * What this tier's checkout should actually ask right now.
     *
     * Resolved against what is live rather than what was true when the rows were written: a
     * question naming a field since archived, and a collection whose destination has since
     * been archived, both drop out here rather than reaching the processor. The rows stay,
     * so restoring either brings it back.
     */
    async resolve(productId: string): Promise<ResolvedCheckout> {
        const rows = await this.readRows(productId);
        const [row] = rows;
        if (!row) {
            return {customFields: [], shipping: null, taxNumber: null, phone: null};
        }

        // Everything unusable already answered as absent when the row was read, so nothing
        // is decided here: a question whose field was archived has no `askable`, and
        // `collecting` is already only what has somewhere active to go.
        const customFields: ResolvedQuestion[] = rows
            .filter(candidate => candidate.question && candidate.askable)
            .map(candidate => ({...candidate.question!, ...candidate.askable!}));

        return {customFields, ...row.collecting};
    }

    /**
     * State a tier's checkout configuration. Each part is replaced whole, and a part the
     * request does not name is left as it was.
     *
     * One transaction for all of it, destinations included. A publisher stated one thing,
     * and it either happened or it did not.
     */
    async edit(productId: string, input: unknown): Promise<CheckoutConfigResult> {
        const parsed = CheckoutConfigInput.safeParse(input);
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            throw new errors.ValidationError({message: issue.message, property: issue.path.join('.') || 'checkout'});
        }
        const stated = parsed.data;
        const now = new Date();

        await this.knex.transaction(async (trx) => {
            if (stated.custom_fields) {
                await this.writeQuestions(trx, productId, stated.custom_fields, now);
            }
            if (stated.shipping) {
                // One toggle, two destinations: the checkout returns both together, so
                // turning it off unbinds both and turning it on binds whichever were named.
                const shipping = {productId, collectColumn: 'shipping_collect' as const};
                await writeBinding(trx, productId, STRIPE_PORT.shippingName, {
                    collect: stated.shipping.collect && Boolean(stated.shipping.name),
                    custom_field_key: stated.shipping.name?.custom_field_key
                }, 'short_text', now, shipping);
                await writeBinding(trx, productId, STRIPE_PORT.shippingAddress, {
                    collect: stated.shipping.collect,
                    custom_field_key: stated.shipping.address?.custom_field_key
                }, 'address', now, shipping);
            }
            if (stated.tax_number) {
                await writeBinding(trx, productId, STRIPE_PORT.taxNumber, stated.tax_number, 'short_text', now, {
                    productId,
                    collectColumn: 'tax_number_collect'
                });
            }
            if (stated.phone) {
                await writeBinding(trx, productId, STRIPE_PORT.phone, stated.phone, 'short_text', now, {
                    productId,
                    collectColumn: 'phone_collect'
                });
            }
            if (stated.shipping || stated.tax_number || stated.phone) {
                await writeCollection(trx, productId, stated, now);
            }
        });

        return this.read(productId);
    }

    /**
     * State a tier's questions.
     *
     * Two rows each: the binding that says where the answer lands, and the question that
     * says how it is asked. The binding's port is the field's own key, because that is what
     * the answer comes back under — a checkout hands us back the key we sent, and that key
     * is what makes it recognisable without a lookup.
     *
     * Stated whole, so a question left out stops being asked: its binding goes, and the
     * question row goes with it by cascade.
     */
    private async writeQuestions(
        trx: Knex.Transaction,
        productId: string,
        questions: NonNullable<CheckoutConfigInput['custom_fields']>,
        now: Date
    ): Promise<void> {
        await assertQuestionsAskable(trx, productId, questions);

        const asked = questions.map(question => question.key);
        const stale = trx(BINDINGS_TABLE)
            .where('product_id', productId)
            .whereIn('id', trx(QUESTIONS_TABLE).select('binding_id'));
        if (asked.length > 0) {
            stale.whereNotIn('port', asked);
        }
        await stale.del();

        for (const [index, question] of questions.entries()) {
            const bindingId = await bindQuestion(trx, productId, question.key, now);
            const asking = {
                sort_order: index,
                label: question.label ?? null,
                optional: question.optional ?? true
            };

            const updated = await trx(QUESTIONS_TABLE)
                .where('binding_id', bindingId)
                .update({...asking, updated_at: now});
            if (updated === 0) {
                await trx(QUESTIONS_TABLE).insert({
                    id: new ObjectID().toHexString(),
                    binding_id: bindingId,
                    created_at: now,
                    ...asking
                });
            }
        }
    }
}

/**
 * The binding a question is asked through, created or repointed.
 *
 * Port and destination hold the same key today, because a publisher picks one field and the
 * checkout asks under it. They are separate columns all the same: the port is what the
 * source calls it, the destination is where it lands, and only the second is theirs to move.
 */
async function bindQuestion(
    trx: Knex.Transaction,
    productId: string,
    key: string,
    now: Date
): Promise<string> {
    const existing = await trx(BINDINGS_TABLE).where({product_id: productId, port: key}).first();
    if (existing) {
        await trx(BINDINGS_TABLE).where('id', existing.id).update({custom_field_key: key, updated_at: now});
        return existing.id;
    }

    const id = new ObjectID().toHexString();
    await trx(BINDINGS_TABLE).insert({
        id,
        product_id: productId,
        port: key,
        custom_field_key: key,
        created_at: now,
        updated_at: now
    });
    return id;
}

/**
 * Group rows into one aggregate per tier.
 *
 * Only grouping. What each row contributes was decided when it was read, so there is nothing
 * to branch on here — a part that is present is a part that belongs, and the collection
 * repeats identically on every row of a tier because it came from one row of one table.
 */
function fold(rows: CheckoutRowParts[]): Map<string, TierCheckoutConfig> {
    const configs = new Map<string, TierCheckoutConfig>();

    for (const row of rows) {
        const config = configs.get(row.tierId) ?? emptyCheckoutConfig(row.tierId);
        if (row.question) {
            config.customFields.push(row.question);
        }
        if (row.collection) {
            Object.assign(config, row.collection);
        }
        configs.set(row.tierId, config);
    }

    return configs;
}

/**
 * Point a kind of thing at one of the publisher's fields, or at nothing.
 *
 * Read-then-write rather than an upsert, because the two unique indexes mean different
 * things and the engines disagree about which one an upsert answers to. MySQL's ON DUPLICATE
 * KEY UPDATE fires on whichever index was hit, so a clash on `custom_field_key` would
 * quietly rewrite a different kind's destination; SQLite, told to conflict on the port,
 * raises instead. Deciding here makes both behave the same, and the indexes stay as the
 * backstop.
 */
async function writeBinding(
    trx: Knex.Transaction,
    productId: string,
    port: StripePort,
    stated: {collect: boolean; custom_field_key?: string},
    valueType: string,
    now: Date,
    stillWanted: {productId: string; collectColumn: CollectColumn}
): Promise<void> {
    const where = {product_id: productId, port};

    if (!stated.collect) {
        // A destination is site-wide and a toggle is not, so one tier switching off is not
        // the site changing its mind. Unbinding here regardless would take every other
        // tier's destination with it and stop them collecting, silently, from a write that
        // never mentioned them. Gone only once nothing wants it.
        const [wanted] = await trx(CONFIG_TABLE)
            .where(stillWanted.collectColumn, true)
            .whereNot('product_id', stillWanted.productId)
            .limit(1)
            .select('product_id');
        if (!wanted) {
            await trx(BINDINGS_TABLE).where(where).del();
        }
        return;
    }

    const field = await trx(FIELDS_TABLE).where('key', stated.custom_field_key!).first();
    if (!field) {
        throw new errors.ValidationError({
            message: `Unknown custom field: ${stated.custom_field_key}`,
            property: `checkout.${port}.custom_field_key`
        });
    }
    // An archived field is not a destination. Binding to one would leave a checkout
    // collecting into somewhere the publisher has already put out of reach.
    if (field.status !== FIELD_STATUS.active) {
        throw new errors.ValidationError({
            message: 'An archived custom field cannot receive collected data. Restore it first.',
            property: `checkout.${port}.custom_field_key`
        });
    }
    // Matching exactly rather than by what would happen to parse, so a value already checked
    // against what a checkout collects needs no second thought at the field.
    if (field.type !== valueType) {
        throw new errors.ValidationError({
            message: `This can only be collected into a ${valueType} field.`,
            property: `checkout.${port}.custom_field_key`
        });
    }

    // One unique index on this table, so the conflict target is unambiguous and both engines
    // agree what it means. Nothing to check for a field already in use: several writers
    // landing in one field is the shape this is for, and the value records which one wrote.
    await trx(BINDINGS_TABLE)
        .insert({
            id: new ObjectID().toHexString(),
            ...where,
            custom_field_key: stated.custom_field_key!,
            created_at: now,
            updated_at: now
        })
        .onConflict(['product_id', 'port'])
        .merge({custom_field_key: stated.custom_field_key!, updated_at: now});
}

/**
 * Read, merge, upsert, all on the transaction's executor.
 *
 * What a request names is merged over what the tier already collects, so a body that says
 * nothing about the phone number leaves it alone. The merge happens here rather than in the
 * upsert because the domain object is the unit of writing: a whole collection is encoded to
 * columns, which is also what lets a configuration be read and handed straight back.
 *
 * One unique index on this table and no other, so the conflict target is unambiguous and
 * both engines agree on what it means. The read has to run on `trx` and not the base
 * connection: a single-connection pool would deadlock reading around an open transaction.
 */
async function writeCollection(
    trx: Knex.Transaction,
    productId: string,
    stated: CheckoutConfigInput,
    now: Date
): Promise<void> {
    const row = await trx(CONFIG_TABLE).where('product_id', productId).first();
    const merged: StoredCollection = row
        ? z.decode(collectionCodec, row as unknown as z.input<typeof DbCheckoutCollection>)
        : {shipping: null, taxNumber: false, phone: false};

    if (stated.shipping) {
        merged.shipping = stated.shipping.collect
            ? {allowedCountries: stated.shipping.allowed_countries ?? []}
            : null;
    }
    if (stated.tax_number) {
        merged.taxNumber = stated.tax_number.collect;
    }
    if (stated.phone) {
        merged.phone = stated.phone.collect;
    }

    const columns = z.encode(collectionCodec, merged);
    await trx(CONFIG_TABLE)
        .insert({
            id: new ObjectID().toHexString(),
            product_id: productId,
            created_at: now,
            updated_at: now,
            ...columns
        })
        .onConflict('product_id')
        // Named rather than bare, so a conflict rewrites what the tier collects and leaves
        // the row's identity and its created_at as they were.
        .merge({...columns, updated_at: now});
}

/**
 * What only the definitions can answer: may this field be asked for, and is something
 * already collecting into it.
 *
 * How many questions there may be, and that none repeats, are rules about the request and
 * are settled by the schema before this runs.
 */
async function assertQuestionsAskable(
    trx: Knex.Transaction,
    productId: string,
    questions: NonNullable<CheckoutConfigInput['custom_fields']>
): Promise<void> {
    // A question is asked under the field's own key, and that key is the binding's port. So
    // a field keyed like something this tier already collects would want a port the tier has
    // taken — the unique index would refuse it as a conflict nobody could read.
    const collides = questions.find(question => STRIPE_PORTS.includes(question.key as never));
    if (collides) {
        throw new errors.ValidationError({
            message: `A field keyed ${collides.key} cannot be asked at checkout, because that is what this checkout calls something it collects for itself.`,
            property: 'checkout.custom_fields'
        });
    }

    const keys = questions.map(question => question.key);
    if (keys.length === 0) {
        return;
    }

    // The binding join is scoped to this tier and to its collection ports: a field another
    // tier collects into is not this tier's problem, and a field this tier asks as a question
    // is bound by that question, which is not a clash with itself.
    const rows: Array<FieldRow & {bound_port: string | null}> = await trx(FIELDS_TABLE)
        .leftJoin(BINDINGS_TABLE, function () {
            this.on(`${BINDINGS_TABLE}.custom_field_key`, `${FIELDS_TABLE}.key`)
                .andOn(trx.raw(`${BINDINGS_TABLE}.product_id = ?`, [productId]))
                .andOn(trx.raw(`${BINDINGS_TABLE}.port in (${STRIPE_PORTS.map(() => '?').join(', ')})`, [...STRIPE_PORTS]));
        })
        .whereIn(`${FIELDS_TABLE}.key`, keys)
        .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
        .select(
            `${FIELDS_TABLE}.key`,
            `${FIELDS_TABLE}.name`,
            `${FIELDS_TABLE}.type`,
            `${FIELDS_TABLE}.status`,
            `${BINDINGS_TABLE}.port as bound_port`
        );
    const byKey = new Map(rows.map(row => [row.key, row]));

    for (const question of questions) {
        const field = byKey.get(question.key);
        if (!field) {
            throw new errors.ValidationError({
                message: `Unknown custom field: ${question.key}`,
                property: 'checkout.custom_fields'
            });
        }
        if (!CHECKOUT_ELIGIBLE_FIELD_TYPES.includes(field.type as never)) {
            throw new errors.ValidationError({
                message: `A ${field.type} field cannot be asked for at checkout.`,
                property: 'checkout.custom_fields'
            });
        }
        // A field something already collects into would be asked twice on the same page.
        if (field.bound_port) {
            throw new errors.ValidationError({
                message: `${field.name} is already collected automatically, so the checkout would ask for it twice.`,
                property: 'checkout.custom_fields'
            });
        }
        const prompt = question.label ?? field.name;
        if (prompt.length > MAX_CHECKOUT_LABEL_LENGTH) {
            throw new errors.ValidationError({
                message: `A checkout question can be at most ${MAX_CHECKOUT_LABEL_LENGTH} characters. Give this one a shorter label.`,
                property: 'checkout.custom_fields'
            });
        }
    }
}
