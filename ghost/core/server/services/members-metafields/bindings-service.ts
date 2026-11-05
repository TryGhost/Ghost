import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { z } from 'zod';
import type { FieldType } from '@tryghost/metafield-types';
import { isRecordValue, matchShape } from '@tryghost/metafield-types/structure';
import { IdentityTextSchema, type Key, type Namespace } from '@tryghost/metafield-types/identity';
import { INTERNAL, MEMBERS } from './access';
import {
  FIELDS_TABLE,
  fieldReference,
  onField,
  type FieldIdentity,
  type FieldSource,
} from './queries';
import { DbBoundField, FIELD_STATUS } from './schema';
import type { MetafieldPlan, MetafieldValuesService } from './values-service';

const BINDINGS_TABLE = 'members_metafield_bindings';

export interface BoundField {
  bindingId: string;
  namespace: Namespace;
  key: Key;
  type: FieldType;
}

/** Plans for the values a source sent, in the order they arrived. */
/**
 * Who answers for the values sent through ports: for a checkout, the binding that routed each
 * value, and for a member giving them in Portal, the member. Where each was written follows from
 * who wrote it, so a pairing that can't happen can't be asked for.
 */
export type PortWriter = { type: 'binding' } | { type: 'member'; id: string };

/** One value refused, named by the port it was sent through, with the part refused after it. */
export interface PortRefusal {
  message: string;
  property: string;
}

/** What the values a source sent through ports come to. */
export interface RoutedPlans {
  /** The writes for the values accepted, one plan for each writer, in the order values arrived. */
  plans: MetafieldPlan[];
  /** Every value refused, named by its port, as `<port>[.<part>]`. */
  refused: PortRefusal[];
  /** The ports that write into an active field, whose values are kept rather than dropped. */
  kept: ReadonlySet<string>;
}

/**
 * Where a source sends what it collected: a `port` is the name that source uses for a
 * thing, and the binding resolves it to one of the publisher's fields.
 */
export class MetafieldBindingsService {
  private knex: Knex;
  private fields: FieldSource;
  private values: Pick<MetafieldValuesService, 'planOrRefuse' | 'getValuesForMember'>;

  constructor({
    knex,
    fields,
    values,
  }: {
    knex: Knex;
    fields: FieldSource;
    values: Pick<MetafieldValuesService, 'planOrRefuse' | 'getValuesForMember'>;
  }) {
    this.knex = knex;
    this.fields = fields;
    this.values = values;
  }

  async bind(db: Knex, port: string, field: FieldIdentity, now: Date): Promise<string> {
    const existing = await db(BINDINGS_TABLE).where({ port }).first();
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
      port,
      ...fieldReference(field),
      created_at: now,
      updated_at: now,
    });
    return bindingId;
  }

  /**
   * Which of these ports write into a field, whatever that field's status. Deleting a field
   * deletes its bindings, so a port bound here always has one.
   */
  async boundPorts(db: Knex, ports: readonly string[]): Promise<Set<string>> {
    if (!ports.length) {
      return new Set();
    }
    return new Set(await db(BINDINGS_TABLE).whereIn('port', ports).pluck('port'));
  }

  /** Whether any port writes into this field. */
  async isBound(field: FieldIdentity): Promise<boolean> {
    return (await this.knex(BINDINGS_TABLE).where(fieldReference(field)).first('id')) !== undefined;
  }

  /** Stops the writing. Whatever hangs off the binding cascades with it. */
  async remove(db: Knex, port: string): Promise<void> {
    await db(BINDINGS_TABLE).where({ port }).del();
  }

  /**
   * Plans the values a source sent through ports into the fields they write into, writing
   * nothing, for whoever saves them.
   *
   * Every source shares the same rules. Each value replaces what its field holds, as `whole`
   * says. A value for a port bound nowhere, or into an archived field, is dropped. The binding
   * admits the rest, whoever sent them: a port exists because a publisher pointed it at a field,
   * and that decision is what admits a value, rather than who is looking. The values accepted are
   * planned whatever is refused of the others, as they have nothing to do with each other beyond
   * arriving together, and every refusal comes back, named by its port, for the caller to act on:
   * a checkout webhook has already taken the money, so saves what it can, while a member giving
   * answers is owed every refusal before anything changes. Where two values land in one field, the
   * last of them is what the field holds.
   *
   * What is recorded against the values is the writer. For a checkout, nobody supplied them in a
   * sense the site can name, so each is recorded against the binding that routed it, which
   * resolves back to what it was collected as and the field it landed in. A member typing their
   * own address is answerable for it in a way no routing is, so their values are theirs.
   */
  async planThrough(
    values: Array<{ port: string; value: unknown }>,
    writer: PortWriter,
  ): Promise<RoutedPlans> {
    const fields = await this.fieldsFor(values.map(({ port }) => port));
    const input: Record<string, unknown> = {};
    const routed = new Map<string, { port: string; field: BoundField }>();
    for (const { port, value } of values) {
      const field = fields.get(port);
      if (field) {
        input[identityOf(field)] = whole(field.type, value);
        routed.set(identityOf(field), { port, field });
      }
    }
    const kept = new Set(fields.keys());
    if (routed.size === 0) {
      return { plans: [], refused: [], kept };
    }

    const { writes, refusals } = await this.values.planOrRefuse(
      input,
      INTERNAL,
      // Every value planned came through a port, so each refusal names one.
      (identity) => routed.get(identity)?.port ?? identity,
    );

    // One plan for each writer, so a member's answers are one change and each binding's value is
    // its own.
    const plans = new Map<string, MetafieldPlan>();
    for (const write of writes) {
      const field = routed.get(identityOf(write.field))?.field;
      if (!field) {
        continue;
      }
      const origin = originOf(writer, field);
      const key = JSON.stringify(origin);
      const plan = plans.get(key) ?? { writes: [], origin };
      plan.writes.push(write);
      plans.set(key, plan);
    }
    return { plans: [...plans.values()], refused: refusals, kept };
  }

  /**
   * What a member holds in the field each of these ports writes into, by port, as they're
   * allowed to see it, while that field is active, whoever wrote it there.
   */
  async heldThrough(memberId: string, ports: readonly string[]): Promise<Map<string, unknown>> {
    const [fields, values] = await Promise.all([
      this.fieldsFor(ports),
      this.values.getValuesForMember(memberId, MEMBERS),
    ]);
    const supplied = new Map<string, unknown>();
    for (const [port, field] of fields) {
      const value = values?.[field.namespace]?.[field.key];
      if (value !== undefined) {
        supplied.set(port, value);
      }
    }
    return supplied;
  }

  /**
   * The field each of these ports writes into, by port, leaving out a port bound nowhere or into
   * an archived field, as nothing can be read from or saved into one there.
   */
  private async fieldsFor(ports: readonly string[]): Promise<Map<string, BoundField>> {
    const fields = new Map<string, BoundField>();
    if (!ports.length) {
      return fields;
    }

    const rows = await this.knex(BINDINGS_TABLE)
      .join(this.fields.table(this.knex), onField(FIELDS_TABLE, BINDINGS_TABLE))
      .whereIn(`${BINDINGS_TABLE}.port`, ports)
      // An archived field is still where a port points, and still not somewhere a value can be
      // read from or land, so it's left out rather than waited for.
      .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
      .select(
        `${BINDINGS_TABLE}.port`,
        `${BINDINGS_TABLE}.id as binding_id`,
        `${FIELDS_TABLE}.namespace`,
        `${FIELDS_TABLE}.key`,
        `${FIELDS_TABLE}.type`,
      );

    for (const row of rows) {
      // Decoded rather than trusted: a join is a read boundary, and `type` is what decides
      // how a value is read. Unreadable counts as unbound rather than throwing, so one bad row
      // skips its port instead of failing every other value that came with it.
      const bound = DbBoundField.safeParse(row);
      if (!bound.success) {
        logging.warn(
          {
            event: { name: 'members.metafields.binding_unreadable' },
            err: bound.error,
            port: row.port,
          },
          'A binding could not be read',
        );
        continue;
      }
      fields.set(bound.data.port, {
        bindingId: bound.data.binding_id,
        namespace: bound.data.namespace,
        key: bound.data.key,
        type: bound.data.type,
      });
    }
    return fields;
  }
}

/** How a write names the field a port writes into. */
function identityOf(field: { namespace: Namespace; key: Key }): string {
  return z.encode(IdentityTextSchema, { namespace: field.namespace, key: field.key, parts: [] });
}

/** Where a value was written, from who wrote it and the field it landed in. */
function originOf(writer: PortWriter, field: BoundField): MetafieldPlan['origin'] {
  return writer.type === 'binding'
    ? { writtenBy: { type: 'binding', id: field.bindingId }, source: 'checkout' }
    : { writtenBy: { type: 'member', id: writer.id }, source: 'portal' };
}

/**
 * An answer as a whole value of its field's type, so it replaces what the field holds rather
 * than merging into it, whoever collected it: a record names every part its type declares, one
 * left out as `null`. Anything else is already whole, and a value that isn't a record is left for
 * the field's rule to refuse.
 */
function whole(type: FieldType, value: unknown): unknown {
  return matchShape(type, {
    scalar: () => value,
    set: () => value,
    record: ({ parts }) => {
      if (!isRecordValue(value)) {
        return value;
      }
      const declared = Object.keys(parts);
      // An answer holds something: one with no part to give is the empty record the field's
      // rule refuses, rather than every part cleared.
      if (!declared.some((part) => value[part] !== undefined && value[part] !== null)) {
        return {};
      }
      return { ...Object.fromEntries(declared.map((part) => [part, null])), ...value };
    },
  });
}
