import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import type { FieldType } from '@tryghost/metafield-types';
import { formatIdentity } from '@tryghost/metafield-types/identity';
import { INTERNAL } from './access';
import type { MetafieldRef } from './models';
import { DbBoundField, FIELD_STATUS, type WriteOrigin } from './schema';
import type { MetafieldPlan, MetafieldValuesService } from './values-service';

const FIELDS_TABLE = 'members_metafields';
const BINDINGS_TABLE = 'members_metafield_bindings';

export interface BoundField extends MetafieldRef {
  bindingId: string;
  type: FieldType;
}

/**
 * What a value's provenance is, once the port it came through has been resolved.
 *
 * An intersection rather than `Extract`: a member writes from more than one place, so only
 * narrowing each pairing to checkout keeps the member among the writers here.
 */
type Attribution = (binding: BoundField) => WriteOrigin & { source: 'checkout' };

/** Plans for the values a source sent, in the order they arrived. */
export interface RoutedPlans {
  plans: MetafieldPlan[];
  /** The first value that couldn't be placed or was refused. The rest are still planned. */
  failure?: unknown;
}

/**
 * Where a source sends what it collected: a `port` is the name that source uses for a
 * thing, and the binding resolves it to one of the publisher's fields.
 */
export class MetafieldBindingsService {
  private knex: Knex;
  private values: Pick<MetafieldValuesService, 'planWrite'>;

  constructor({ knex, values }: { knex: Knex; values: Pick<MetafieldValuesService, 'planWrite'> }) {
    this.knex = knex;
    this.values = values;
  }

  async bind(
    db: Knex,
    productId: string,
    port: string,
    field: MetafieldRef,
    now: Date,
  ): Promise<string> {
    const existing = await db(BINDINGS_TABLE).where({ product_id: productId, port }).first();
    if (existing?.metafield_namespace === field.namespace && existing.metafield_key === field.key) {
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
      metafield_namespace: field.namespace,
      metafield_key: field.key,
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
   * Plans the values a processor collected on Ghost's behalf and sent back.
   *
   * Nobody supplied these in a sense the site can name — a payment page asked, and a
   * machine reported the answers — so what is recorded against them is the binding that
   * routed each one. That resolves back to the tier that asked, what it was collected
   * as, and the field it landed in, which is everything worth knowing about how the
   * value arrived.
   */
  async planCollected(
    productId: string,
    collected: Array<{ port: string; value: unknown }>,
  ): Promise<RoutedPlans> {
    return this.planThrough(productId, collected, (binding) => ({
      writtenBy: { type: 'binding', id: binding.bindingId },
      source: 'checkout',
    }));
  }

  /**
   * Plans values a member supplied about themselves, through the same ports a checkout uses.
   *
   * A member typing their own address into a form is answerable for it in a way no
   * routing is, and a record saying a binding wrote it would be wrong. The member is the
   * one whose record this is, so there is nobody else it could be.
   */
  async planSuppliedByMember(
    memberId: string,
    productId: string,
    supplied: Array<{ port: string; value: unknown }>,
  ): Promise<RoutedPlans> {
    return this.planThrough(productId, supplied, () => ({
      writtenBy: { type: 'member', id: memberId },
      source: 'checkout',
    }));
  }

  /**
   * Plans come back in the order values arrive, which is the order to apply them: where
   * two land in one field, the last of them is what the field holds.
   *
   * Every value is attempted, and the first failure is returned alongside the plans for
   * the rest. Attempting them all is this method's business: one refused answer must not
   * cost a publisher the address a courier needs, and the values have nothing to do with
   * each other beyond arriving together. Whether the failure is worth acting on is the
   * caller's — a checkout webhook has already taken the money and must never fail, while
   * a member filling in a form is owed the news.
   */
  private async planThrough(
    productId: string,
    values: Array<{ port: string; value: unknown }>,
    attribute: Attribution,
  ): Promise<RoutedPlans> {
    const plans: MetafieldPlan[] = [];
    let failure: unknown;

    for (const { port, value } of values) {
      try {
        // Inside, because working out where a value goes can fail the same way checking
        // it can, and a value nobody could place is no more reason to abandon the rest
        // than one the catalog refused.
        const destination = await this.resolve(productId, port);
        if (!destination) {
          continue;
        }
        // Internal: what may be set is bounded by the binding rather than by who is
        // looking. A port exists because a publisher pointed it at a field, and that
        // decision is what admits the value, whoever supplied it.
        const writes = await this.values.planWrite(
          {
            [formatIdentity({
              namespace: destination.namespace,
              key: destination.key,
              partPath: null,
            })]: value,
          },
          INTERNAL,
        );
        plans.push({ writes, origin: attribute(destination) });
      } catch (err) {
        failure = failure ?? err;
      }
    }

    return { plans, failure };
  }

  private async resolve(productId: string, port: string): Promise<BoundField | null> {
    const row = await this.knex(BINDINGS_TABLE)
      .join(FIELDS_TABLE, function () {
        this.on(`${BINDINGS_TABLE}.metafield_namespace`, `${FIELDS_TABLE}.namespace`).andOn(
          `${BINDINGS_TABLE}.metafield_key`,
          `${FIELDS_TABLE}.key`,
        );
      })
      .where(`${BINDINGS_TABLE}.product_id`, productId)
      .where(`${BINDINGS_TABLE}.port`, port)
      // An archived destination is still where this goes, and still not somewhere a value
      // can land, so the write drops rather than waiting.
      .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
      .select(
        `${BINDINGS_TABLE}.id as binding_id`,
        `${FIELDS_TABLE}.namespace`,
        `${FIELDS_TABLE}.key`,
        `${FIELDS_TABLE}.type`,
      )
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

    return {
      bindingId: bound.data.binding_id,
      namespace: bound.data.namespace,
      key: bound.data.key,
      type: bound.data.type,
    };
  }
}
