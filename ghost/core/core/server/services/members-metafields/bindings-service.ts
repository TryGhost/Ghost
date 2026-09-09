import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import type { FieldType } from '@tryghost/metafield-types';
import { INTERNAL } from './access';
import { DbBoundField, FIELD_STATUS, type WrittenBy } from './schema';
import type { MetafieldValuesService, PlannedWrite } from './values-service';

const FIELDS_TABLE = 'members_metafields';

const { CUSTOM_NAMESPACE } = require('@tryghost/metafield-types/identity');
const BINDINGS_TABLE = 'members_metafield_bindings';

export interface BoundField {
  bindingId: string;
  key: string;
  type: FieldType;
}

/** What a value's provenance is, once the port it came through has been resolved. */
type Attribution = (binding: BoundField) => WrittenBy;

/**
 * Where a source sends what it collected: a `port` is the name that source uses for a
 * thing, and the binding resolves it to one of the publisher's fields.
 */
export class MetafieldBindingsService {
  private knex: Knex;
  private values: MetafieldValuesService;

  constructor({ knex, values }: { knex: Knex; values: MetafieldValuesService }) {
    this.knex = knex;
    this.values = values;
  }

  async bind(
    db: Knex,
    productId: string,
    port: string,
    metafieldKey: string,
    now: Date,
  ): Promise<string> {
    const existing = await db(BINDINGS_TABLE).where({ product_id: productId, port }).first();
    if (existing?.metafield_key === metafieldKey) {
      await db(BINDINGS_TABLE).where('id', existing.id).update({ updated_at: now });
      return existing.id;
    }
    if (existing) {
      await db(BINDINGS_TABLE).where('id', existing.id).del();
    }

    const bindingId = new ObjectID().toHexString();
    await db(BINDINGS_TABLE).insert({
      id: bindingId,
      product_id: productId,
      port,
      metafield_key: metafieldKey,
      created_at: now,
      updated_at: now,
    });
    return bindingId;
  }

  /** Stops the writing. Whatever hangs off the binding cascades with it. */
  async remove(db: Knex, productId: string, port: string): Promise<void> {
    await db(BINDINGS_TABLE).where({ product_id: productId, port }).del();
  }

  /**
   * Values a processor collected on Ghost's behalf and sent back.
   *
   * Nobody supplied these in a sense the site can name — a payment page asked, and a
   * machine reported the answers — so what is recorded against them is the binding that
   * routed each one. That resolves back to the tier that asked, what it was collected
   * as, and the field it landed in, which is everything worth knowing about how the
   * value arrived.
   */
  async writeCollected(
    memberId: string,
    productId: string,
    collected: Array<{ port: string; value: unknown }>,
  ): Promise<void> {
    return this.writeThrough(memberId, productId, collected, (binding) => ({
      type: 'binding',
      id: binding.bindingId,
    }));
  }

  /**
   * Values a member supplied about themselves, through the same ports a checkout uses.
   *
   * A member typing their own address into a form is answerable for it in a way no
   * routing is, and a record saying a binding wrote it would be wrong. The member is the
   * one whose record this is, so there is nobody else it could be.
   */
  async writeSuppliedByMember(
    memberId: string,
    productId: string,
    supplied: Array<{ port: string; value: unknown }>,
  ): Promise<void> {
    return this.writeThrough(memberId, productId, supplied, () => ({
      type: 'member',
      id: memberId,
    }));
  }

  /**
   * Values arrive in the order they are to be applied: where two land in one field, the
   * last of them is what the field holds.
   *
   * Every value is attempted, and then the first failure is raised. Attempting them all
   * is this method's business: one refused answer must not cost a publisher the address
   * a courier needs, and the values have nothing to do with each other beyond arriving
   * together. Whether the failure is worth acting on is the caller's, which is why it
   * leaves here rather than being logged and forgotten — a checkout webhook has already
   * taken the money and must never fail, while a member filling in a form is owed the
   * news.
   */
  private async writeThrough(
    memberId: string,
    productId: string,
    values: Array<{ port: string; value: unknown }>,
    attribute: Attribution,
  ): Promise<void> {
    let failure: unknown;

    for (const { port, value } of values) {
      try {
        // Inside, because working out where a value goes can fail the same way storing
        // it can, and a value nobody could place is no more reason to abandon the rest
        // than one nobody could store.
        const destination = await this.resolve(productId, port);
        if (!destination) {
          continue;
        }
        await this.writeOne(memberId, destination, value, attribute);
      } catch (err) {
        failure = failure ?? err;
      }
    }

    if (failure) {
      throw failure;
    }
  }

  private async writeOne(
    memberId: string,
    into: BoundField,
    value: unknown,
    attribute: Attribution,
  ): Promise<void> {
    // Internal: what may be set is bounded by the binding rather than by who is
    // looking. A port exists because a publisher pointed it at a field, and that
    // decision is what admits the value, whoever supplied it.
    const planned: PlannedWrite[] = await this.values.planWrite(
      { [`${CUSTOM_NAMESPACE}.${into.key}`]: value },
      INTERNAL,
    );

    await this.values.applyWrite(memberId, planned, { writtenBy: attribute(into) });
  }

  private async resolve(productId: string, port: string): Promise<BoundField | null> {
    const row = await this.knex(BINDINGS_TABLE)
      .join(FIELDS_TABLE, `${BINDINGS_TABLE}.metafield_key`, `${FIELDS_TABLE}.key`)
      .where(`${BINDINGS_TABLE}.product_id`, productId)
      .where(`${BINDINGS_TABLE}.port`, port)
      // An archived destination is still where this goes, and still not somewhere a value
      // can land, so the write drops rather than waiting.
      .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
      .select(`${BINDINGS_TABLE}.id as binding_id`, `${FIELDS_TABLE}.key`, `${FIELDS_TABLE}.type`)
      .first();

    if (!row) {
      return null;
    }

    // Decoded rather than trusted: a join is a read boundary, and `type` is what decides
    // how the collected value is read. Unreadable counts as unresolved rather than
    // throwing, so one bad row skips its value the way an unbound port does instead of
    // failing everything else the same checkout collected.
    const bound = DbBoundField.safeParse(row);
    if (!bound.success) {
      logging.warn(
        {
          event: { name: 'members.metafields.binding_unreadable' },
          err: bound.error,
          productId,
          port,
        },
        'A binding could not be read',
      );
      return null;
    }

    return { bindingId: bound.data.binding_id, key: bound.data.key, type: bound.data.type };
  }
}
