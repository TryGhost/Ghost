import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import type { FieldType } from '@tryghost/custom-field-types';
import { FIELD_STATUS, WRITTEN_BY } from './schema';
import type { CustomFieldValuesService, PlannedWrite } from './values-service';

const FIELDS_TABLE = 'members_custom_fields';
const BINDINGS_TABLE = 'members_custom_field_bindings';

export interface BoundField {
  bindingId: string;
  key: string;
  type: FieldType;
}

/**
 * Where a source sends what it collected: a `port` is the name that source uses for a
 * thing, and the binding resolves it to one of the publisher's fields.
 */
export class CustomFieldBindingsService {
  private knex: Knex;
  private values: CustomFieldValuesService;

  constructor({ knex, values }: { knex: Knex; values: CustomFieldValuesService }) {
    this.knex = knex;
    this.values = values;
  }

  async bind(
    db: Knex,
    productId: string,
    port: string,
    customFieldKey: string,
    now: Date,
  ): Promise<string> {
    // Read then write, because neither engine returns the row's id from an upsert
    // portably and a question row hangs off it.
    const existing = await db(BINDINGS_TABLE).where({ product_id: productId, port }).first();
    if (existing) {
      await db(BINDINGS_TABLE)
        .where('id', existing.id)
        .update({ custom_field_key: customFieldKey, active: true, updated_at: now });
      return existing.id;
    }

    const bindingId = new ObjectID().toHexString();
    await db(BINDINGS_TABLE).insert({
      id: bindingId,
      product_id: productId,
      port,
      custom_field_key: customFieldKey,
      active: true,
      created_at: now,
      updated_at: now,
    });
    return bindingId;
  }

  /** Stops the writing, keeping the row so the destination is still known. */
  async unbind(db: Knex, productId: string, port: string, now: Date): Promise<void> {
    await db(BINDINGS_TABLE)
      .where({ product_id: productId, port })
      .update({ active: false, updated_at: now });
  }

  /** Forgets the destination too. Whatever hangs off the binding cascades with it. */
  async remove(db: Knex, productId: string, port: string): Promise<void> {
    await db(BINDINGS_TABLE).where({ product_id: productId, port }).del();
  }

  async destinationFor(db: Knex, productId: string, port: string): Promise<string | null> {
    const own = await db(BINDINGS_TABLE).where({ product_id: productId, port }).first();
    if (own) {
      return own.custom_field_key;
    }

    const elsewhere = await db(BINDINGS_TABLE)
      .where('port', port)
      .orderBy('created_at', 'asc')
      .first();
    return elsewhere ? elsewhere.custom_field_key : null;
  }

  /**
   * Values arrive in the order they are to be applied: where two land in one field, the
   * last of them is what the field holds.
   */
  async writeCollected(
    memberId: string,
    productId: string,
    collected: Array<{ port: string; value: unknown }>,
  ): Promise<void> {
    for (const { port, value } of collected) {
      const destination = await this.resolve(productId, port);
      if (!destination) {
        continue;
      }
      await this.writeOne(memberId, destination, value);
    }
  }

  private async writeOne(memberId: string, into: BoundField, value: unknown): Promise<void> {
    let planned: PlannedWrite[];
    try {
      planned = await this.values.planWrite({ [into.key]: value });
    } catch (err) {
      logging.warn(
        {
          event: { name: 'members.custom_fields.collected_value_rejected' },
          custom_field_key: into.key,
          reason: err instanceof Error ? err.message : String(err),
        },
        'A collected value could not be saved',
      );
      return;
    }

    try {
      await this.values.applyWrite(memberId, planned, {
        writtenBy: { type: WRITTEN_BY.binding, id: into.bindingId },
      });
    } catch (err) {
      logging.error(err);
    }
  }

  private async resolve(productId: string, port: string): Promise<BoundField | null> {
    const row = await this.knex(BINDINGS_TABLE)
      .join(FIELDS_TABLE, `${BINDINGS_TABLE}.custom_field_key`, `${FIELDS_TABLE}.key`)
      .where(`${BINDINGS_TABLE}.product_id`, productId)
      .where(`${BINDINGS_TABLE}.port`, port)
      .where(`${BINDINGS_TABLE}.active`, true)
      .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
      .select(`${BINDINGS_TABLE}.id as binding_id`, `${FIELDS_TABLE}.key`, `${FIELDS_TABLE}.type`)
      .first();

    return row ? { bindingId: row.binding_id, key: row.key, type: row.type } : null;
  }
}
