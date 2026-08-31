import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import type { FieldType } from '@tryghost/custom-field-types';
import { DbBoundField, FIELD_STATUS } from './schema';
import type { CustomFieldValuesService, PlannedWrite } from './values-service';

const FIELDS_TABLE = 'members_custom_fields';

// The bindings store references publisher fields by bare key (its FK), so the
// identity handed to the values service is stated here, at that store's boundary.
const { CUSTOM_NAMESPACE } = require('@tryghost/custom-field-types/identity');
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
    const existing = await db(BINDINGS_TABLE).where({ product_id: productId, port }).first();
    if (existing?.custom_field_key === customFieldKey) {
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
      custom_field_key: customFieldKey,
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
      planned = await this.values.planWrite({ [`${CUSTOM_NAMESPACE}.${into.key}`]: value });
    } catch (err) {
      logging.warn(
        {
          event: { name: 'members.custom_fields.collected_value_rejected' },
          err,
          memberId,
          customFieldKey: into.key,
        },
        'A collected value could not be saved',
      );
      return;
    }

    try {
      await this.values.applyWrite(memberId, planned, {
        writtenBy: { type: 'binding', id: into.bindingId },
      });
    } catch (err) {
      logging.error(
        {
          event: { name: 'members.custom_fields.collected_value_write_failed' },
          err,
          memberId,
          customFieldKey: into.key,
          bindingId: into.bindingId,
        },
        'Failed to store a collected custom field value',
      );
    }
  }

  private async resolve(productId: string, port: string): Promise<BoundField | null> {
    const row = await this.knex(BINDINGS_TABLE)
      .join(FIELDS_TABLE, `${BINDINGS_TABLE}.custom_field_key`, `${FIELDS_TABLE}.key`)
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
          event: { name: 'members.custom_fields.binding_unreadable' },
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
